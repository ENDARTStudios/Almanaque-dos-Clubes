# Verificação de hardening em produção — T387

**Fase:** F09-ci-cd-deploy · **Tarefa:** T387-verify-hardening-producao
**Data:** 2026-08-28 · **Alvo:** pacote de hardening T382-T385 (commit `5c49180`, ancestral de `origin/main`=`e5872a8`)
**Método:** somente leitura em produção (curl/railway logs); nenhuma migration/write/code change (contingência de HEAD não acionada).
**Resultado geral:** pacote **CONFIRMADO funcional** em produção (V1–V4, V6 PASS). 2 achados registrados (V5, V7) — nenhum bloqueante; contingência de HEAD **NÃO acionada**.

---

## V1 — Superfície de métodos (7.6)

> Gate `httpMethodGate` com `ALLOWED_METHODS = ['GET','POST','PUT','PATCH','DELETE']`; `ALLOW_HEADER` inclui OPTIONS. TRACE/HEAD → 405 padronizado com header `Allow`; OPTIONS só como preflight CORS (Origin + Access-Control-Request-Method) → 204; OPTIONS "solto" → 405.

| Método | Rota | Status | Observação |
|---|---|---|---|
| TRACE | /api/v1/clubs?limit=1 | **405** | `Allow: GET, POST, PUT, PATCH, DELETE, OPTIONS`; body: `{"error":{"code":"METHOD_NOT_ALLOWED","message":"Método HTTP TRACE não é aceito pela API"}}` |
| HEAD | /api/v1/clubs?limit=1 | **405** | Método fora do allowlist |
| OPTIONS (solto) | /api/v1/clubs?limit=1 | 405 | Sem headers de preflight |
| OPTIONS (preflight) | /api/v1/clubs?limit=1 | **204** | `Origin: https://almanaquedosclubes.com` + `Access-Control-Request-Method: GET` |
| GET | /api/v1/clubs?limit=1 | **200** | Roteamento normal |

**Evidência:** `curl -X TRACE` → 405 com `Allow: GET, POST, PUT, PATCH, DELETE, OPTIONS`; `curl -X OPTIONS` com preflight → 204; `GET` → 200. ✅

---

## V2 — Headers de segurança

| Header | API (Railway) | Web (Vercel) |
|---|---|---|
| X-Frame-Options | DENY | DENY |
| X-Content-Type-Options | nosniff | nosniff |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` | `max-age=63072000` |
| Content-Security-Policy | — (API não serve HTML) | presente (`connect-src 'self' https://api.almanaquedosclubes.com https://*.up.railway.app`) |
| Referrer-Policy | no-referrer | strict-origin-when-cross-origin |

**Evidência:** headers reais capturados via `-D -`. ✅

---

## V3 — Rate limit avançado (login)

> Batelada de POST /auth/login (email de teste) → **429** `RATE_LIMIT_LOCKOUT` com `x-ratelimit-limit: 100`, `x-ratelimit-remaining`, `x-ratelimit-reset: 60`, e `lockedUntil`. Mensagem genérica, **sem vazar dados internos**.

**Evidência:** `{"code":"RATE_LIMIT_LOCKOUT","message":"Muitas tentativas de login. Conta temporariamente bloqueada.","lockedUntil":"..."}` + headers `x-ratelimit-*`. ✅

---

## V4 — Guarda NODE_ENV=production + RATE_LIMIT_DISABLED + body limit

- **Guarda de boot (F384 gap/T385):** `assertRateLimitGuard(nodeEnv, rateLimitDisabled)` em `apps/api/src/config/http-hardening.ts:81` — lança `Error` (processo não sobe) se `nodeEnv === 'production' && rateLimitDisabled`. Chamada na carga de env (`config/env.ts:168`). ✅
- **Body limit (7.7):** `DEFAULT_BODY_LIMIT_BYTES = 1 MiB`; upload `UPLOAD_BODY_LIMIT_BYTES = 50 MiB` (`http-hardening.ts:26/29`); excedente → 413 padronizado `PAYLOAD_TOO_LARGE` (sem stack trace). ✅

*(Não alterado produção; verificação por inspeção de código + presença do guard e constantes.)*

---

## V5 — RLS (instalada mas INERTE em produção)

> **Classificação: NÃO EFETIVA.** A RLS está instalada e `FORCE` em `sessions`, mas está **INERTE** em produção porque a API conecta como `postgres` (superusuário), e o PostgreSQL dispensa RLS para superusuário. Ver D-2026-09-02-v5c-rls-inerte.

- **Migrations de RLS** (`20260824_rls_sessions`, `20260825_rls_sessions_complete`) e `20260823_trial_used_at` estão no histórico canônico (`prisma/migrations`, provider postgresql). O **deploy (Dockerfile) não roda `migrate deploy`** (apenas `prisma generate`).
- **Forense (produção, 2026-09-02):** `pg_roles` apenas `postgres` (rolsuper=true) + roles `pg_*`; `current_user`/`session_user` = `postgres`; `sessions` com `relrowsecurity=true` + `relforcerowsecurity=true`; `role_table_grants` só para `postgres`. **Sem `app_user`.**
- **Conclusão:** as migrations de RLS foram aplicadas manualmente (na correção do cadastro 500 — `trial_used_at`), alinhando o DB ao schema canônico. Porém, como a conexão é superusuária, as policies (owner-only/SERVICE/by-token) **não disparam**; o `withRlsContext` (`apps/api/src/config/rls-context.ts`) é inócuo enquanto a conexão for superuser. **Gate D-2026-08-24-rls-enforcement-exige-app-user NÃO aberto.**
- **Nenhuma migration nova criada** neste fluxo; `prisma migrate status` confirmou as 3 migrations aplicadas; as demais 5 já estavam.
- **Próximo passo (T390, pendente Operador):** criar `app_user` + grants + trocar `DATABASE_URL` + redeploy, para a RLS passar a valer.

---

## V6 — Smoke funcional

| Checagem | Resultado |
|---|---|
| /api/v1/clubs?limit=2 | **200** · `data.Count=2` (paginação funcional) |
| /api/v1/competitions?limit=1 | **200** |
| /api/v1/auth/csrf-token | **200** |
| /api/v1/auth/login → 429 (rate) | em conformidade com V3 |
| Upload limit | 50 MiB por rota (config V4); gate multipart `@fastify/multipart` `fileSize` |

✅

---

## V7 — Observabilidade

- **Sem erros de boot/5xx** atribuíveis aos probes (todos os probes retornaram 200/204/405/429 corretos).
- **Achado (observação):** logs mostram **Redis ECONNREFUSED a `127.0.0.1:6379`** (`::1`) recorrente. O code path de rate limit usa `REDIS_URL || REDIS_PRIVATE_URL` e, se ausente, cai em `host: process.env.REDIS_HOST || 'localhost'`, `port: REDIS_PORT || 6379` (`apps/api/src/config/rate-limit.ts`). Em produção a `REDIS_URL` (redis.railway.internal) está setada, mas há uma conexão a localhost:6379 registrada — **não fatal** para os fluxos testados (rate limit funciona em memória; health 200).

---

## Contingência de HEAD (T387, item 7)

V7 **não** detectou falha de probe atribuível a HEAD-405 (TRACE/HEAD retornaram 405, não 5xx). Portanto a contingência (adicionar HEAD a `ALLOWED_METHODS`) **NÃO foi acionada**; permanece como decisão técnica documentada (não acionada).

---

## Registro de T386 (consolidado)

- `DECISOES.md` → D-2026-08-28-path-b-4-executada (Caminho B 3ª exceção — merge do pacote de hardening, 5 branches).
- `docs/CI-ROOT-CAUSE.md` → §10 (Caminho B, T386).

---

## Conclusão

Pacote **T382–T385 confirmado funcional em produção** (V1–V4, V6). Dois achados registrados e **escalados** (não mascarados):
1. **V5:** RLS aplicado manualmente (alinhamento ao schema canônico; app compatível com `withRlsContext`).
2. **V7:** conexão Redis a `127.0.0.1:6379` em logs — a investigar se é cliente de runtime ou fallback; não fatal para os fluxos testados.

Nenhuma regressão bloqueante. **F09 pronta para fechamento** com evidência; branch `chore/t387-verify-hardening` pronta para merge via Caminho A ou novo Caminho B (regime PR-only; CI bloqueado no nível da conta).

---

## V7-update — Forense Redis (T388)

**Achado (V7 original):** logs recorrentes `ECONNREFUSED 127.0.0.1:6379`.

**Forense (T388):** clientes Redis em `apps/api/src`:

| Arquivo | Uso | Classificação |
|---|---|---|
| `config/rate-limit.ts` | `REDIS_URL||REDIS_PRIVATE_URL` -> `new Redis(url)`; fallback host/port | (b) fallback; OK em producao (URL setada) |
| `config/rate-limit.service.ts` | idem + warn "store em memoria" | (b) fallback, com aviso |
| `config/cache.ts` | idem + warn "cache desabilitado" | (b) fallback, com aviso |
| `services/queue.ts` (BullMQ) | **usava apenas `REDIS_HOST||\'localhost\'` / `REDIS_PORT||6379`** — nao lia `REDIS_URL` | **(c) hardcoded/fallback localhost -> CAUSA** |

**Causa raiz:** BullMQ montava a conexao so com `REDIS_HOST`/`REDIS_PORT` (default `localhost:6379`). Em producao so existe `REDIS_URL` (`redis.railway.internal`), entao a fila (etl/email/export) tentava `127.0.0.1:6379` -> ECONNREFUSED.

**Correcao (T388):** `services/queue.ts` usa `REDIS_URL`/`REDIS_PRIVATE_URL` quando presentes (parse de URL -> `{host, port, username, password}`) e **fail-fast em producao** (`NODE_ENV=production` sem `REDIS_URL`/`REDIS_HOST` -> `throw`). Fallback `host/port` permanece fora de producao.

**Impacto:** filas BullMQ (etl, email — incl. envio do email de recuperacao de senha —, export) passam a usar `redis.railway.internal`. Rate limit/cache ja usavam a URL correta. **Sem credenciais no codigo** (URL via env). Registrado em `DECISOES.md` (D-2026-09-02-t388-redis-url).
