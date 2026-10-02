# Findings Candidates — Security Audit 2026-09-29 (Passada 1, estática)

> **TODOS os registros abaixo têm `verdict: "needs_validation"`.** Esta foi uma passada de análise
> ESTÁTICA (leitura de código): nenhum ataque foi executado, nenhuma requisição foi feita a
> produção. Conforme a skill (`report-schema.json`), registros `needs_validation` **não recebem
> severidade de veredito**; a coluna "Severidade proposta" é triagem para priorizar a validação
> (passada 2) e NÃO constitui severidade confirmada. Cada candidato traz a evidência fonte
> (`arquivo:linha`), a causa alegada (`claimed_root_cause`), os bloqueadores e o plano de validação.

Índice: 13 candidatos — 2 proposed-high, 5 proposed-medium, 5 proposed-low, 1 proposed-informational.

---

## C-01 · `api.clubs.create-unauthenticated-write` — proposed-HIGH

**Título:** Escrita anônima no catálogo: `POST /api/v1/clubs` sem autenticação.

**Descrição:** A rota de criação de clube não tem `preHandler` de autenticação, ao contrário das
escritas equivalentes de players e competitions. O token CSRF exigido pelo middleware global é
emitido anonimamente por `GET /auth/csrf-token` (sem auth), então um cliente direto (curl) obtém o
token e cria clubes arbitrários no catálogo público.

**Causa alegada (`claimed_root_cause`):** omissão de `[authenticate, requirePermission(...)]` no
registro da rota — inconsistência entre módulos irmãos.

**Trace:**
1. `entrypoint` — `apps/api/src/modules/clubs/routes.ts:23` — `app.post('/clubs', ...)` sem `preHandler`.
2. `propagation` — `apps/api/src/middleware/csrf.ts:53-66` — CSRF aceita token anônimo de uso único.
3. `propagation` — `apps/api/src/modules/auth/auth.routes.ts:71-83` — `GET /auth/csrf-token` público,
   `userId = 'anonymous'`.
4. `sink` — `apps/api/src/modules/clubs/service.ts:29-53` — `clubsService.create` grava via Prisma.

**Evidência:**
- `apps/api/src/modules/clubs/routes.ts:23-33` — sem `authenticate`.
- `apps/api/src/modules/players/routes.ts:9-11` e `apps/api/src/modules/competitions/routes.ts:9-11` —
  mesmas escritas COM `[authenticate, requirePermission(...)]` (controle irmão que o clube não tem).
- `apps/api/src/modules/auth/auth.routes.ts:76-81` — emissão anônima, bucket 600/15min.
- `packages/domain/src/club.ts:6-27` — `CreateClubSchema` valida formato (name 2-200 etc.), não autoriza.

**Blockers:** validação requer confirmar que não há hook global de auth (revisado: `app.ts` não
registra nenhum) e que a escrita é realmente indesejada (decisão de produto — se "criação aberta de
clubes" for intencional, vira hardening de moderação, não achado).

**Plano de validação:**
- `local`: subir a API em sandbox (dummy DB) e demonstrar `POST /clubs` 201 sem cookie, apenas com
  token anônimo; comparar com `POST /players` 401.
- `deployment`: confirmar com o dono se escrita anônima é intencional.

---

## C-02 · `web.jsonld.script-breakout` — proposed-HIGH

**Título:** XSS armazenado via JSON-LD: `JSON.stringify` em `dangerouslySetInnerHTML` não escapa `</script>`.

**Descrição:** As páginas do Next.js embutem JSON-LD com `dangerouslySetInnerHTML={{ __html:
JSON.stringify(jsonLd) }}`. `JSON.stringify` NÃO escapa `<`, `>` ou `/`, então um valor do banco
contendo `</script><script>…</script>` quebra o contexto do elemento `<script>` e executa no
documento. O campo `name` do JSON-LD de `/clubs/[id]` vem do nome do clube — que qualquer anônimo
pode criar via C-01. Dados de ingestão de terceiros (Wikidata/RSSSF/Nominatim) são caminho
alternativo para o mesmo sink. O CSP do web (`script-src 'unsafe-inline'`, C-08) NÃO mitiga.

**Causa alegada:** serialização de dados não-confiáveis em contexto de script HTML sem escape de
`<` (padrão seguro: substituir `<` por `\u003c` — recomendação do próprio Next.js para JSON-LD).

**Trace:**
1. `entrypoint` — `apps/api/src/modules/clubs/routes.ts:23` — nome controlado por anônimo entra no banco.
2. `propagation` — `apps/api/src/modules/clubs/profile.service.ts` — perfil lê o clube do banco.
3. `sink` — `apps/web/src/app/clubs/[id]/page.tsx:149-153` — `JSON.stringify(jsonLd)` em
   `dangerouslySetInnerHTML` dentro de `<script type="application/ld+json">` (parser HTML encerra
   o script em `</script>` independente do `type`).

**Evidência:**
- `apps/web/src/app/clubs/[id]/page.tsx:149-153` — `name: club.name` + `JSON.stringify`.
- Mesmo padrão: `apps/web/src/app/layout.tsx:86`, `apps/web/src/app/players/[id]/page.tsx:60`,
  `apps/web/src/app/competitions/[id]/page.tsx:54`.
- `apps/web/next.config.ts:32` — `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (sem blocker).

**Blockers:** execução não foi demonstrada (análise estática); React/Next podem aplicar
sanitização adicional em alguma camada desconhecida; impacto real depende do cookie `access_token`
(httpOnly — exfil de cookie direto não ocorre, mas execução de script no origem permite ações
autenticadas do usuário vítima, ex.: chamadas fetch com `credentials: 'same-origin'`).

**Plano de validação:**
- `local`: fixture Next.js com `jsonLd.name = '</script><img src=x onerror=...>'` renderizada em
  sandbox; verificar DOM resultante. Reproduzir o trace C-01→C-02 contra dummy DB.
- `deployment`: inspecionar HTML servido de uma página de clube com nome de teste.

---

## C-03 · `api.backup.secret-nontiming-compare` — proposed-MEDIUM

**Título:** Segredo de backup comparado sem timing-safe; sucesso devolve dump completo do banco (PII).

**Descrição:** `POST /admin/backup` autentica por `x-backup-secret` com comparação `!==` (não
constante). O codebase já tem helper timing-safe (`config/crypto.ts`). A rota é isenta de CSRF por
design e o único rate limit é o global por IP (contornável se C-04 confirmar). Sucesso devolve o
banco inteiro — clubes, players, competitions, rankings, favorites e **users com email** — sem
audit log da chamada.

**Causa alegada:** comparação de segredo com `!==` + segredo compartilhado estático sem
rotação/audit, para endpoint que expõe PII.

**Trace:**
1. `entrypoint` — `apps/api/src/modules/admin/backup.routes.ts:13-18` — comparação `provided !== secret`.
2. `propagation` — `apps/api/src/app.ts:88-101` — rate limit global 100/min/IP como único throttle.
3. `sink` — `apps/api/src/modules/admin/backup.routes.ts:20-46` — dump completo (users incl. email).

**Evidência:** `backup.routes.ts:16` (comparação); `config/crypto.ts:126-139` (helper timing-safe
existente e não usado); sem log/audit da chamada em `backup.routes.ts`.

**Blockers:** explorabilidade de timing attack sobre rede (barulho, JIT) é incerta — não foi
demonstrada; entropia real de `BACKUP_SECRET` em produção é fato externo.

**Plano de validação:**
- `local`: harness comparando `timingSafeEqual` vs `!==` com pares de prefixo para medir viés;
  revisão do comprimento/entropia do segredo (sem ler `.env` — perguntar ao dono).
- `deployment`: dono confirma entropia/rotação de `BACKUP_SECRET`; adicionar audit log.

---

## C-04 · `api.trustproxy.xff-rate-limit-bypass` — proposed-MEDIUM

**Título:** `trustProxy: true` incondicional permite forjar `request.ip` (X-Forwarded-For) e
contornar rate limits por IP.

**Descrição:** O Fastify é configurado com `trustProxy: true` sem restrição a proxies conhecidos;
com isso `request.ip` deriva do `X-Forwarded-For` enviável pelo cliente. Todo o rate limiting por
IP (global 100/min, janelas por IP em auth, brute-force de login por IP+email em
`rate-limit.service.ts`) chaveia por um valor que o cliente pode escolher. Efeito adicional: o
fallback em memória do rate limit cresce sem teto (Map com cleanup só após 24h — `config/rate-limit.ts:19-28`).

**Causa alegada:** confiança irrestrita em headers de proxy (`trustProxy: true`) combinada com
chaves de rate limit derivadas de `request.ip`.

**Trace:**
1. `entrypoint` — `apps/api/src/app.ts:73-77` — `Fastify({ trustProxy: true, ... })`.
2. `propagation` — `apps/api/src/app.ts:92` — `keyGenerator: (request) => request.ip`.
3. `sink` — `apps/api/src/config/rate-limit.ts:96-109` — janelas `ip:<request.ip>`; fallback
   `memoryStore` sem limite de chaves (`rate-limit.ts:19-28, 53-59`).

**Evidência:** `app.ts:75` (trustProxy), `app.ts:92` (keyGenerator), `config/rate-limit.ts:19-28`
(Map sem teto), `config/rls-context.ts`/middleware que usam `request.ip` para auth windows.

**Blockers:** comportamento do proxy de borda (Railway) é decisivo e externo ao repo: se o
ingress SOBRESCREVE `X-Forwarded-For`, o bypass não existe; se apenas APENDA, o cliente controla o
valor mais à esquerda que o Fastify aceita. Sem observação de deploy, indecidível.

**Plano de validação:**
- `local`: subir dummy Fastify `trustProxy:true` e enviar `X-Forwarded-For: 1.2.3.4, real` —
  demonstrar qual IP é escolhido.
- `deployment`: `railway` — observar header efetivo atrás do edge (ou configurar
  `trustProxy: ['loopback', 'linklocal', 'uniquelocal']`/IP do proxy e re-testar).

---

## C-05 · `api.idempotency.store-unscoped-unbounded` — proposed-MEDIUM

**Título:** Middleware de idempotência: replay global sem escopo e store em memória sem limite.

**Descrição:** O store de idempotência é um `Map` global chaveado APENAS pelo header
`idempotency-key`, sem escopo de usuário/rota e sem limite de tamanho. (a) Qualquer requester que
apresente a mesma key recebe o corpo da resposta anterior (replay entre usuários se a key vazar/for
adivinhável); (b) um anônimo pode gerar keys únicas infinitas, retendo corpos de resposta (até
grandes) por 24h — exaustão de memória do processo; ampliado se C-04 confirmar bypass do rate limit.

**Causa alegada:** chave de idempotência sem vínculo com identidade/rota e store sem bounds.

**Trace:**
1. `entrypoint` — `apps/api/src/middleware/idempotency.ts:6-12` — lê `idempotency-key` de POST/PUT/PATCH.
2. `sink` — `middleware/idempotency.ts:13-23` — `idempotencyStore.get(key)` devolve `{status, body}`
   a qualquer requester; `set(key, ...)` sem limite (TTL 24h).

**Evidência:** `middleware/idempotency.ts:3` (Map global), `:13-16` (replay sem verificação de
dono/rota), `:20-21` (armazenamento sem bounds).

**Blockers:** tamanho real dos corpos de resposta em produção (medir) e exploração de replay
depende de key previsível/vazada (UUIDv4 do cliente não é previsível).

**Plano de validação:**
- `local`: dummy app com duas "sessões" distintas usando a mesma key — demonstrar replay
  cross-context; medir RSS do processo após N keys.
- `deployment`: monitorar memória da API sob keys sintéticas (canário).

---

## C-06 · `api.cors.vercel-app-wildcard-allowlist` — proposed-MEDIUM

**Título:** CORS com `credentials: true` reflete qualquer origem `*.vercel.app` (origens
attacker-controlled).

**Descrição:** A allowlist de CORS aceita qualquer origem casando
`^https:\/\/[\w-]+\.vercel\.app$` — qualquer terceiro pode deployar um projeto no Vercel e obter
uma origem permitida COM credenciais. O fluxo de cookie é mitigado hoje por `sameSite: 'strict'`
(navegador não envia cookies cross-site), mas o controle de origem fica derrotado: basta uma
mudança futura de cookie (`sameSite: 'none'`) ou uso de token em header para escalar para leitura
autenticada cross-origin; também habilita fetches credenciados de contexto não-browser que
controlado por origem maliciosa.

**Causa alegada:** regex de preview do Vercel muito ampla (deveria casar apenas os subdomínios do
próprio projeto/team).

**Trace:**
1. `entrypoint` — `apps/api/src/app.ts:152-168` — `origin` handler com `credentials: true`.
2. `sink` — `app.ts:156` — regex `vercel.app` genérica → origem refletida com `Access-Control-Allow-Credentials`.

**Evidência:** `app.ts:156` (regex), `app.ts:167` (`credentials: true`),
`apps/api/src/modules/auth/jwt.service.ts:93-99` (`sameSite: 'strict'` — mitigação atual).

**Blockers:** nenhum bloqueador de fonte para a existência do wildcard; impacto cross-site real
depende do `sameSite` corrente (fonte) e do comportamento de cookies do browser (fato externo padrão).

**Plano de validação:**
- `local`: dummy CORS fixture — refletir origem `attacker.vercel.app` e conferir headers de resposta.
- `deployment`: restringir a regex aos subdomínios reais do projeto (ex.: `^https://(www\.)?almanaquedosclubes\.com$|preview-fixos$`) e revalidar E2E.

---

## C-07 · `env.s3.default-credentials-fallback` — proposed-MEDIUM

**Título:** Credenciais S3 com fallback hardcoded (`almanaque` / `almanaque_dev_2025`) em qualquer ambiente.

**Descrição:** `env.ts` aplica fallbacks hardcoded para `S3_ACCESS_KEY_ID` e
`S3_SECRET_ACCESS_KEY` quando as env vars não estão definidas — inclusive em produção. Se o deploy
de produção não definir as credenciais, o módulo de upload opera com segredo público do repositório.

**Causa alegada:** fallback dev-friendly sem guarda de produção (diferente do padrão JWT, que
falha o boot em prod).

**Trace:**
1. `entrypoint` — `apps/api/src/config/env.ts:216-217` — `?? 'almanaque'` / `?? 'almanaque_dev_2025'`.
2. `sink` — `apps/api/src/config/s3.ts` (consumidor) — cliente S3 montado com essas credenciais.

**Evidência:** `env.ts:214-219` (defaults), contraste com `env.ts:95-119` (JWT com fail-fast em prod).

**Blockers:** se produção define as vars (fato externo, não observável sem consultar o deploy), o
achado degrada para hardening. Não lemos `.env` por regra da auditoria.

**Plano de validação:**
- `deployment`: dono confirma que `S3_SECRET_ACCESS_KEY` está definida em produção (sem expor o
  valor); adicionar `assertRateLimitGuard`-style guard para S3 em prod.

---

## C-08 · `web.csp.unsafe-inline-eval` — proposed-LOW

**Título:** CSP do web com `script-src 'unsafe-inline' 'unsafe-eval'` — controle de mitigação de
XSS neutralizado.

**Descrição:** A CSP (`next.config.ts`) existe, mas permite inline e eval em scripts: qualquer XSS
bem-sucedido (ex.: C-02) roda sem blocker. É redução de um controle explícito (a CSP é a barreira
secundária declarada da app).

**Causa alegada:** `'unsafe-inline' 'unsafe-eval'` em `script-src` provavelmente por conveniência
de compat (Next dev/hydration) sem nonce.

**Trace:** `entrypoint/sink` — `apps/web/next.config.ts:26-32` — CSP aplicada a todas as rotas `/(.*)`.

**Evidência:** `next.config.ts:32` (diretiva completa).

**Blockers:** se nonce-based CSP quebrar hidratação/terceiros do Next 16, a correção exige teste —
não demonstrado nesta passada.

**Plano de validação:** `local` — build Next em sandbox com nonce/strict-dynamic e smoke test das
páginas públicas.

---

## C-09 · `web.hsts.absent-next-config` — proposed-LOW

**Título:** Sem `Strict-Transport-Security` no `next.config.ts` do web (a API tem HSTS no helmet).

**Descrição:** A API define HSTS em produção via helmet (`config/security.ts:15`), mas o web não
define HSTS em `headers()`; o edge Vercel pode injetar HSTS por padrão — fato de deploy não
observável no repo.

**Causa alegada:** header ausente da fonte web.

**Trace:** `entrypoint/sink` — `apps/web/next.config.ts:17-37` — lista de headers sem HSTS.

**Evidência:** `next.config.ts:22-32`; contraste `apps/api/src/config/security.ts:15`.

**Blockers:** comportamento do edge Vercel (se adiciona `Strict-Transport-Security` por padrão) —
externo ao repo.

**Plano de validação:** `deployment` — `curl -sI https://almanaquedosclubes.com` (pelo dono) ou
inspeção do painel Vercel; se ausente, adicionar em `headers()`.

---

## C-10 · `api.metrics.public-endpoint` — proposed-LOW

**Título:** `/api/v1/metrics` público expõe contadores operacionais.

**Descrição:** Métricas Prometheus sem autenticação revelam volume de tráfego, taxa de 5xx e
falhas de auth (`auth_failures_total`) — útil para recon (padrões de uso, janelas de
manutenção, taxa de erros de login).

**Causa alegada:** rota de métricas registrada no escopo público sem hook de auth nem
allowlist de rede.

**Trace:** `entrypoint/sink` — `apps/api/src/routes/metrics.ts:8-14` — GET público; hook
`onResponse` em `app.ts:191-198` alimenta os contadores.

**Evidência:** `routes/metrics.ts:9-13`; `middleware/csrf.ts:48` (isenta de CSRF).

**Blockers:** política de exposição de métricas é decisão do dono (alguns expõem de propósito).

**Plano de validação:** `deployment` — confirmar intenção; restringir a rede interna/Railway
private network ou exigir token.

---

## C-11 · `api.health.log-injection` — proposed-LOW

**Título:** `/health` escreve query params (`m`, `st`) direto em stdout — injeção/flooding de log.

**Descrição:** O beacon de CI escreve `q.m` e `q.st` sem sanitização em `process.stdout.write` —
strings com `\n` forjam linhas de log; strings longas/únicas Incham logs (custo/ruído forense).
Rate limit global é o único throttle.

**Causa alegada:** input de query concatenado em stream de log sem validação.

**Trace:**
1. `entrypoint` — `apps/api/src/routes/health.ts:11` — `q.m`/`q.st` do querystring.
2. `sink` — `routes/health.ts:13-16` — `process.stdout.write('[ci-beacon] m=${q.m} st=${q.st}...')`.

**Evidência:** `routes/health.ts:12-16`.

**Blockers:** impacto depende de onde os stdout são consumidos (Railway log drain — fato externo).

**Plano de validação:** `local` — dummy: `?m=x%0AFAKE%20LOG%20LINE` — verificar segunda linha;
correção: allowlist `m∈{m,st}` + strip `[^\w-]` e cap de tamanho.

---

## C-12 · `api.cache.key-cardinality-unbounded` — proposed-LOW

**Título:** Chaves de cache com cardinalidade/tamanho não limitados (`search:global`, `geo:points`) —
flooding de Redis.

**Descrição:** `search:global` inclui o `q` normalizado sem limite de tamanho (query até ~8KB vira
chave Redis) e `geo:points` inclui bbox com floats arbitrários — cada request único cria uma chave
com corpo da resposta por TTL (60s/300s), sem teto de cardinalidade. Pressiona memória do Redis
compartilhado (mesmo Redis do rate limit).

**Causa alegada:** chave de cache derivada de input não-confiável sem normalização a cardinalidade
limitada (ex.: hash) nem quota por chave/ip.

**Trace:**
1. `entrypoint` — `apps/api/src/modules/search/routes.ts:14-44` / `apps/api/src/modules/geo/routes.ts:32-56`.
2. `propagation` — `global-search.service.ts:189-190` / `geo.service.ts:136-137` — chave inclui `q`/bbox raw.
3. `sink` — `apps/api/src/services/cache.ts:61-68` — `redis.setex` sem bounds.

**Evidência:** `global-search.service.ts:190` (`q` na chave), `geo.service.ts:137` (bbox na chave),
`routes/search/routes.ts:16-21` (sem `maxLength` em `q`).

**Blockers:** dimensionamento do Redis em produção e uso real (memória) — fato de deploy.

**Plano de validação:** `local` — gerar N chaves sintéticas contra Redis dummy e medir
`used_memory`; correção: hash da chave (`sha256(q)`) + `maxmemory-policy` explícito.

---

## C-13 · `api.docs.swagger-public` — proposed-INFORMATIONAL

**Título:** Swagger UI `/docs` público em produção — enumeração completa da superfície da API.

**Descrição:** `swaggerUi` registrado em `/docs` sem gate de ambiente/auth: um anônimo obtém a
especificação OpenAPI completa (rotas, schemas, cookies de auth), facilitando recon e descoberta
de endpoints não-linkados (ex.: `/admin/backup`).

**Causa alegada:** registro incondicional de `swagger`+`swaggerUi` (`app.ts:123-142`).

**Trace:** `entrypoint/sink` — `apps/api/src/app.ts:139-142` — `routePrefix: '/docs'` público.

**Evidência:** `app.ts:123-142`.

**Blockers:** decisão de produto (algumas APIs expõem docs de propósito).

**Plano de validação:** `deployment` — se não intencional, condicionar a `!env.isProd`.

---

## Não-achados relevantes (controles verificados e sólidos nesta passada)

- **Validação geo (WS-C-3)**: `parseBbox`/`isValidBbox`/`isValidCountry`/`clampGeoLimit` rejeitam
  corretamente NaN/Infinity/fora de faixa/ordem invertida/limit parcial; queries Prisma
  parametrizadas (`apps/api/src/modules/geo/geo.service.ts:131-196`). Hardening: `country` não é
  checado contra lista ISO real (efeito: filtro sem matches — sem risco).
- **Injection SQL**: únicos `$queryRawUnsafe` do repo são parametrizados com schema fixo de
  call-site (`lib/search.ts:38-55`, `users-auth.queries.ts:21-27`) — via `graft grep`.
- **Path traversal estático**: não há `@fastify/static`/`sendFile`/`createReadStream` na API.
- **SSRF de ingestão**: endpoints fixos; QIDs filtrados por `/^Q\d+$/`
  (`lib/wikidata/wikidata-client.ts`); `baseUrl` do NominatimClient injetável apenas em CLI
  operator-side (`scripts/geocode-clubs-nominatim.ts`) — não em superfície atacamável.
- **Vazamento de erro**: 500 genérico em produção em `app.ts` e handlers por módulo; 413 limpo.
- **Cookies**: httpOnly + sameSite strict (`jwt.service.ts:93-99`).

## Bloqueador de ferramenta

`validate-coverage-ledger.cjs` não roda no Windows (exige `fs.constants.O_NOFOLLOW`, indisponível
em win32 — mensagem exata: "OS no-follow and nonblocking input protection is unavailable"). O
ledger foi checado estruturalmente (equivalente local): 25 unidades, IDs únicos percent-encoded,
tabela de estados respeitada (planned/covered/candidate/out_of_scope/not_applicable), sem erros.
Executar o validador oficial em ambiente POSIX na passada 2.
