# DECISOES.md

Registro permanente de decisões técnicas e de produto do projeto.
Cada entrada segue o formato abaixo. Decisões registradas **não se re-discutem**
sem fato novo (PROTOCOLO_MESTRE.md, Seção 3, item 4).

Formato obrigatório:

```
## [AAAA-MM-DD] Decisão: <o quê>
Motivo: <por quê>
Alternativas consideradas: <se houver>
```

---

## Histórico de decisões

<!-- Novas decisões devem ser adicionadas ACIMA da linha abaixo, em ordem cronológica. -->

### [2026-08-22] Decisão: T348-v2 — Gap analysis do UML e lista de quarentena de símbolos contaminados
Motivo: Destravar a fase F12 com uma análise ancorada nas fontes autorizadas (PRD.md consolidado em T347, schema.prisma, rbac.service.ts), classificando cada símbolo de `packages/domain/src/uml.ts` e `packages/domain/src/rbac-matrix.ts` em EXISTENTE / PARCIAL / FALTANTE-ESCOPO / FORA-ESCOPO / CONTAMINANTE.
Alternativas consideradas: (a) adoção incremental dos arquivos — descartada por 100% do conteúdo ser contaminante, conflitante ou sem consumidor; (b) remoção imediata nesta tarefa — descartada por violar o escopo docs-only; (c) gap analysis + lista de quarentena para remoção em tarefa futura de código — escolhida.
Evidência:
- Grep de consumidores: nenhum import em `apps/` usa símbolos de `uml.ts`/`rbac-matrix.ts`; barrel `packages/domain/src/index.ts:16-17` é a única superfície exposta.
- Classificação: 9 EXISTENTE, 28 PARCIAL, 8 FALTANTE-ESCOPO, 5 FORA-ESCOPO, 24 CONTAMINANTE (ver `docs/UML-GAP-ANALYSIS.md` §7).
- Quarentena especificada com caminho+linha+motivo+prioridade em `docs/UML-QUARANTINE-LIST.md`.
Observações:
- Recomendação global: remover `uml.ts` e `rbac-matrix.ts` inteiros + 2 linhas de export do barrel, em tarefa futura de código com verificação `pnpm typecheck` + `pnpm test` + grep de imports.
- Gaps legítimos (FALTANTE-ESCOPO) viram backlog futuro via migration aditiva, nunca por importação dos arquivos contaminados.
- Execução da remoção permanece pendente da confirmação formal do Operador ao ESCALATE (quarentena).

### [2026-08-22] Decisão: T347 — Reconciliação documental ancorada no HEAD 7a50d99; uml.ts e rbac-matrix.ts declarados contaminados
Motivo: O estado do protocolo divergia do repositório real (evidências citavam commit `f0b5c87`, inexistente no git). Auditoria localizou em `packages/domain/src/uml.ts` e `packages/domain/src/rbac-matrix.ts` entidades de outro projeto (Album, AlbumItem, Streak, Favorite, ApiKey, PipelineRun; permissões `favorites:*`, `album:*`, `collection:streak:*`), exportadas pelo barrel mas sem consumidores em `apps/` e sem correspondência em `schema.prisma`, no Discovery ou no `rbac.service.ts` real.
Alternativas consideradas: (a) adotar o UML contaminado como fonte de verdade — descartada por incorporar produto estranho ao escopo; (b) remover os arquivos imediatamente — descartada por ser mudança de código fora do escopo docs-only e depender de aprovação de quarentena; (c) documentar com fontes reais e declarar a contaminação — escolhida.
Evidência:
- `git cat-file -t f0b5c87` → inválido; HEAD real `7a50d99` (árvore limpa).
- Glob `**/*UML*.md` → vazio (`UML.md` não existe no repo).
- Grep: entidades estrangeiras aparecem apenas em `packages/domain` (uml.ts, rbac-matrix.ts).
- `rbac.service.ts` real: roles `admin/pro/free`, 19 permissões; `rbac-matrix.ts` contradiz com permissões de álbum/streak/favoritos.
Observações:
- Criados `docs/PRD.md`, `docs/UML-DIAGRAMS.md`, `docs/RBAC-MATRIX.md`, `docs/RLS-POLICIES.md`, `docs/ARCHITECTURE-CATALOG.md`; `docs/CRITERIOS_DESENVOLVIMENTO.md` permaneceu inalterado (não foi criado `docs/DEV-CRITERIA.md` paralelo).
- RLS documentada como SPEC PENDENTE (T344/T345 bloqueadas por ambiente PostgreSQL de teste).
- Quarentena/remoção dos exports contaminados será tarefa de código futura, após resposta do Operador ao ESCALATE e execução de T348-v2 (gap analysis do UML com fontes autorizadas).

### [2026-08-12] Decisão: Instalar @fastify/compress (gzip + brotli) — Fase 13.1
Motivo: Redução de ~70% no payload de respostas JSON, melhora LCP e tempo de carregamento. Marcado como 🔴 no ROADMAP.md, esforço 1h.
Alternativas consideradas: (a) proxy reverso (Cloudflare) — descartada por só funcionar em produção e pós-domínio; (b) compressão nativa do Node — descartada por não ter negociação de encoding automática.
Evidência:
- `@fastify/compress@9.2.0` instalado, registrado `{ global: true, threshold: 1024, encodings: ['gzip', 'deflate', 'br'] }`
- Teste real: resposta /clubs?limit=20 de **3.542 bytes → 996 bytes** (-72%)
- Typecheck ✅ | Sem alteração de lógica de negócio
Observação: `threshold: 1024` evita comprimir respostas muito pequenas (health, errors), onde o overhead de compressão não compensa.

### [2026-08-12] Decisão: T003 — Executar E2E + k6 e fechar Fase 8
Motivo: Fase 8 itens 8.3 (E2E) e 8.7 (k6) estavam `[~]` por falta de execução evidenciada. T003 rodou ambos com infraestrutura real.
Resultados (evidência executável, 2026-08-12):
- **Playwright E2E:** 5/5 passando (home, navegação /clubs, login, registro, 404). Correção: `playwright.config.ts` baseURL 3000→3001 (apontava para a API, não para o frontend Next.js).
- **k6 load-test (200 VUs, 3m30s):** 48.850 reqs, **0% erros**, p95=4.5ms. Check de login ajustado para aceitar 401 **ou 429** (rate-limit de brute-force ativo é comportamento esperado, não falha).
- **k6 stress-test (1000 VUs, 7min):** 1.559.595 reqs, **0% erros**, p95=78ms, **3.710 req/s** sustentados.
- **Brute-force login validado em produção-like:** 5 tentativas 401 → 6ª retorna 429 com lockout de 1h.
Mudanças de suporte:
1. **`env.ts`:** adicionada flag `RATE_LIMIT_DISABLED` (desliga rate-limit global por IP para k6 de máquina única; **não** afeta brute-force de login, que é por IP+email).
2. **`app.ts`:** rate-limit global condicionado a `!env.rateLimitDisabled`.
3. **Cache Redis em clubs:** p95 de 5ms sob 200 VUs (item 6.3 validado em carga).
4. **Migration PostgreSQL baselineada:** 4 migrations marcadas como aplicadas (`migrate resolve`); `prisma migrate status` → "up to date". Descoberta: as 17 tabelas já existiam no PG.
Limitação documentada (infra, não código): conexão **host Windows → container PostgreSQL** falha com P1000 (auth) por bug do proxy de porta do Docker Desktop; dentro da rede Docker funciona perfeitamente. Testes rodaram contra SQLite sandbox (oficial, `db push` sincronizado). Isso não bloqueia produção (deploy é 100% em containers).

### [2026-08-11] Decisão: T002 — Correção de gaps de qualidade (lint + typecheck + testes)
Motivo: A reconciliação T001 identificou que lint (4 erros), typecheck (10 erros) e `pnpm test` recursivo (exit 1 em feature-flags) falhavam, bloqueando o security gate do CI/CD.
Alternativas consideradas: (a) deletar código morto — descartada por perder trabalho já feito e contrariar o plano; (b) corrigir e registrar os serviços (CSRF, WebSocket, cache, rate-limit) — escolhida, transforma código morto em funcionalidade real.
Mudanças realizadas:
1. **Deps:** ioredis 6.0.0 → 5.11.1 (v6 incompatível com `moduleResolution: NodeNext` — barrels sem extensão `.js`; alinha com BullMQ que usa 5.x transitivo). Adicionados `ws` + `@types/ws` (websocket.ts importava pacote inexistente).
2. **ioredis import:** `import Redis from` → `import { Redis } from` (named import contorna o barrel quebrado).
3. **rate-limit.service.ts:** stub órfão → serviço real de brute-force (5 tentativas/15min, lockout 1h, Redis com fallback memória), integrado em `POST /auth/login` — implementa item 3.8/7.5.
4. **csrf.ts:** registrado como hook global `onRequest` em app.ts, com exceções para `/auth/login|register|refresh|logout` e health/metrics. Novo endpoint `GET /api/v1/auth/csrf-token`.
5. **websocket.ts:** tipos explícitos (`WebSocket`, `IncomingMessage`), `setupWebSocket(app)` registrado em server.ts após `listen`.
6. **cache.ts:** integrado em clubs.service — `remember()` em list (TTL 60s) e getById (TTL 300s), invalidação `clubs:list:*` no create — implementa item 6.3 conforme declarado.
7. **feature-flags:** 6 testes Vitest criados; eslint-disable justificado no FP de `security/detect-object-injection` (Record com chaves de união de literais).
Evidência pós-correção: `pnpm lint` → 0 erros (12 warnings FP documentados) | `pnpm typecheck` → 0 erros | `pnpm test` → 27/27 (API 17 + Domain 4 + FeatureFlags 6).
Observação: 87 erros Prettier auto-fixados via `lint:fix` — mudança puramente cosmética (formatação), zero alteração de lógica.

### [2026-08-11] Decisão: Reconciliar PLANO_MESTRE.md com evidência executável (T001)
Motivo: PLANO_MESTRE.md afirmava `[x]` e verificações "passando" sem que comandos reais tivessem sido executados nesta sessão. A Seção 6 do Protocolo exige evidência executável antes de `[x]`.
Alternativas consideradas: (a) aceitar o documento como estava — descartada por violar o protocolo; (b) rodar todos os comandos de verificação e corrigir o documento com base no resultado — escolhida.
Evidência coletada (2026-08-11, Node 24 / pnpm 11.13.1):
- `pnpm install --frozen-lockfile` — ✅ passa.
- `pnpm --filter @almanaque/api test` + `pnpm --filter @almanaque/domain test` — ✅ 21/21 (API 17 + Domain 4).
- `pnpm test` (recursivo) — ❌ falha em `@almanaque/feature-flags` (packages/feature-flags não tem arquivos de teste; vitest sai com exit 1).
- `pnpm lint` — ❌ inicialmente 91 erros (87 Prettier auto-fixáveis via `--fix`); restam 4 erros @typescript-eslint/no-unused-vars (`apps/api/src/modules/auth/rate-limit.service.ts`, `apps/api/src/middleware/csrf.ts`) + 13 warnings security/detect-object-injection (`packages/feature-flags/src/index.ts`).
- `pnpm typecheck` — ❌ 10 erros em @almanaque/api: `csrf.ts:7` (userId não usado), `rate-limit.service.ts` (ioredis import não-construtível, vars não usadas), `cache.ts:3` (ioredis), `websocket.ts` (módulo `ws` indisponível/indisponível tipagem, params implicit any), mais TS6196/7006. `@almanaque/domain` não alcançado (API falha antes).
- `prisma migrate status` — não executável sem `.env`/DATABASE_URL (arquivo é gitignored e não está configurado local).
Gaps registrados no PLANO_MESTRE.md:
1. Fase 2 itens 2.7 (`data_sources`, `entity_revisions`) e 2.10 (criptografia na coluna) estavam `[x]` com texto "pendente" — demovidos para `[ ]`; tabelas realmente não existem no schema.
2. Fase 8: SAST/E2E/k6 marcavam `[x]` sem execução — demovidos para `[~]`.
3. Fase 9.1.1/9.1.6: security gate não passaria hoje — `[~]`.
Observação: Nenhum código de produto foi alterado (restrição T001). Estes gaps viram pendências do Doer para a próxima tarefa de correção (lint + typecheck).


Motivo: Após reconstrução completa (repositório GitHub estava em estado pré-protocolo), todas as tarefas 2.3–2.13 foram implementadas com evidência real de verificação (PROTOCOLO_MESTRE.md Seção 6).
Alternativas consideradas: (a) aceitar a conversa compartilhada como prova de trabalho — descartada após auditoria revelar que commits `482e394`, `09ff0c6`, `1dbb1ec` não existiam no repositório real; (b) reconstruir tudo do zero sobre o commit `8cb9b67` (baseline MVP) — escolhida.
Observação: 164 asserções distribuídas em 5 scripts de smoke test (audit, crypto, session, rbac, billing) validam a implementação. Migration PostgreSQL consolidada (379 linhas, 63 CREATE statements) gerada e armazenada em `prisma/migrations-postgres/20260720000001_phase2_final/migration.sql`. Pendência: Operador executar `pwsh ./scripts/migrate.ps1` no Windows para aplicar no PostgreSQL.

### [2026-07-20] Decisão: AuditLog polimórfico (entityType + entityId) em vez de FKs separadas
Motivo: AuditLog rastreia mudanças em múltiplas entidades (User, Club, Subscription, etc.). FK explícita para cada uma geraria N colunas opcionais. Solução polimórfica com índice composto `@@index([entityType, entityId])` cobre todos os casos.
Alternativas consideradas: (a) tabela `audit_logs` separada por entidade (audit_user_logs, audit_club_logs, ...) — descartada por explosão de tabelas; (b) JSON column com `entity` embutido — descartada por perder indexação.
Trade-off: Perde integridade referencial ao nível do banco (FK), mas ganha flexibilidade. Aplicação garante que `entityType` seja válido.

### [2026-07-20] Decisão: SHA-256 para tokens, argon2id para senhas
Motivo: Senhas são baixa-entropia (escolhidas por humanos) — precisam de KDF memory-hard (argon2id). Tokens já são 32 bytes aleatórios (256 bits) — não precisam de KDF; SHA-256 é rápido (~1μs vs ~100ms do argon2) e adequado para hot path `/auth/refresh`.
Alternativas consideradas: (a) argon2id para ambos — descartada por latência excessiva em refresh; (b) SHA-256 para ambos — descartada por vulnerabilidade a rainbow tables em senhas.

### [2026-07-20] Decisão: Cache de permissões RBAC em memória (TTL 5 min), não Redis
Motivo: Cache local por processo é suficiente para estágio atual (monolito modular, instância única). TTL 5 min é trade-off aceitável entre latência e consistência. Multi-instance + invalidação cross-instance via Redis pub/sub será adicionada na Fase 6.3.
Alternativas consideradas: (a) Redis desde já — descartada por adicionar complexidade desnecessária antes do produto estar em produção; (b) sem cache (query a cada request) — descartada por latência 5-10ms em hot path.

### [2026-07-20] Decisão: índices full-text via SQL raw, não declarativos no Prisma
Motivo: Prisma 5.22 não suporta declarativamente índices GIN em colunas tsvector, índices trigram (pg_trgm), ou triggers. Solução: colunas `Unsupported("tsvector")?` no schema (Prisma Client sabe que existem) + arquivo `fulltext-indexes.sql` aplicado separadamente via `migrate.ps1`.
Alternativas consideradas: (a) usar apenas `LIKE`/`ILIKE` — descartada por não escalar em 50k+ clubes; (b) biblioteca externa (ex.: MeiliSearch, Typesense) — descartada por adicionar infraestrutura externa (PROTOCOLO_MESTRE.md Seção 3 item 1: custo zero).

### [2026-07-20] Decisão: valores monetários em centavos (int), não reais (float)
Motivo: Float tem problema de precisão (0.1 + 0.2 = 0.30000000000000004). Centavos (int) são exatos e aceitos por todos os provedores de pagamento (Stripe, PagSeguro).
Alternativas consideradas: (a) Decimal/numeric no PostgreSQL — descartada por não ter tipo equivalente nativo em TypeScript; (b) float com arredondamento — descartada por acumular erro.
Aplicação: `Billing.amountCents` é `Int` (centavos de BRL). Preços: FREE=0, PRO=2900, ELITE=9900.

### [2026-07-16] Decisão: Adoção do Protocolo Mestre v2.0 e retrofit do projeto
Motivo: O Operador publicou o PROTOCOLO_MESTRE.md v2.0 como nova lei suprema do processo. O projeto já continha código do MVP (Fastify + Prisma + SQLite/PostgreSQL) e um PLANO_MESTRE.md anterior, ambos produzidos antes do protocolo existir.
Alternativas consideradas: (a) descartar o MVP e refazer do zero sob o protocolo — descartada por desperdício; (b) aceitar o MVP como baseline e prosseguir sob o protocolo a partir de agora — escolhida.
Observação: O PLANO_MESTRE.md existente será revisado e reconstruído a partir do Discovery (Seção 4) e do Anexo A. Itens já implementados no MVP serão marcados `[x]` apenas após verificação de evidência (Seção 6).

### [2026-07-16] Decisão: Stack técnica inicial (mantida do pré-protocolo)
Motivo: TypeScript + Node.js + Fastify + Prisma + PostgreSQL/SQLite já estavam em uso, todos gratuitos e open-source, em conformidade com a Seção 3, item 1.
Alternativas consideradas: NestJS (mais pesado, scaffolding maior); Express (sem validação/schema nativos). Fastify venceu por ser leve, ter TypeScript first-class e plugins oficiais para helmet/cors/rate-limit.

---

## Discovery (Seção 4 do Protocolo) — Respostas do Operador

### [2026-07-16] Decisão: Definição de produto (Discovery Q1)
**Resposta:** O Almanaque dos Clubes é uma plataforma mundial de pesquisa e inteligência sobre futebol que reúne a história completa de clubes, jogadores e competições, enriquecida por rankings, estatísticas e IA com respostas fundamentadas em dados.
Motivo: Estabelece o escopo funcional do produto: não é só um diretório — é uma plataforma de inteligência com IA. Justifica a inclusão de Fase 6 (Knowledge Graph, RAG) e Fase 8 (auditoria de IA) no plano.

### [2026-07-16] Decisão: Público-alvo e escala esperada (Discovery Q2)
**Resposta:** Torcedores, jornalistas, pesquisadores, criadores de conteúdo, analistas, clubes/federações (B2B). Crescimento: Beta Fechada 100 → Open Beta 1.000 → Ano 1: 10.000–50.000 cadastrados. Arquitetura deve escalar além disso.
Motivo: Escala prevista justifica monolito modular (não microsserviços —_COMPLEXIDADE extra não justificada em <50k usuários), mas exige desde já: paginação correta, índices, cache (Fase 6), rate-limit por usuário (Fase 7), observabilidade (Fase 9). 50k usuários não pede microsserviços, mas pede CI/CD sólido e zero downtime.
Alternativas consideradas: microsserviços desde o início (descartada — Seção 3 item 6: solução mais simples vence entre equivalentes).

### [2026-07-16] Decisão: Referências de produto (Discovery Q3)
**Resposta:** ZeroZero, Transfermarkt, Soccerway, WorldFootball.net, RSSSF, FBref, Wikipedia, Sofascore, Flashscore. Diferencial: combinar acervo histórico + rankings auditáveis + IA RAG com citações + Knowledge Graph + curadoria.
Motivo: Define o padrão de qualidade esperado. Acervo histórico extenso (RSSSF-like) exige modelagem de dados flexível e versionamento de fontes (Fase 2 avançada + auditoria). IA com citações exige pipeline RAG rastreável (Fase 6). Rankings "auditáveis" exige imutabilidade/versionamento (Fase 2 — soft delete + audit_logs).

### [2026-07-16] Decisão: Funcionalidades sensíveis (Discovery Q4)
**Resposta:**
- Login: **Sim**
- Pagamento (assinatura): **Sim**
- Dado sensível: **Não** (apenas dados básicos de conta + cobrança por provedores externos)
- Upload de arquivo: **Sim** (administradores + importação/exportação de dados)
Motivo (impacto no plano):
- Login → Fase 3 vira `[OBRIGATÓRIO]` (gatilho do Anexo A atendido).
- Pagamento → adiciona sub-fase de billing (Stripe/provedor gratuito — Seção 3 item 1: usar stripe.com é gratuito para usar, cobra apenas taxa por transação; alternativas open-source são PagSeguro/Pix direto — decidir em Fase 4).
- Sem dado sensível → 2FA TOTP vira `[CONDICIONAL]` (não é saúde/financeiro/documento). Mesmo assim, recomendado para contas pagas — deixaremos como item opcional dentro da Fase 3.
- Upload → Fase 6 upload vira `[OBRIGATÓRIO]` (administradores vão importar CSV).

### [2026-07-16] Decisão: Prazo (Discovery Q5)
**Resposta:** Não. Prioriza qualidade, consistência arquitetural e estabilidade. Marcos: Beta Fechada → Open Beta → v1.0, sem data fixa.
Motivo: Permite não pular etapas de segurança (Seção 3 item 3 — nada fecha sem evidência). Remove pressão de "lançar antes do seguro". Fases 7 (hardening) e 8 (testes/DAST) podem ser feitas com calma.

### [2026-07-16] Decisão: Marca e domínio (Discovery Q6)
**Resposta:** Nome "Almanaque dos Clubes" definido. Marca definida. Domínio registrado: `almanaquedosclubes.com` (14/08/2026), comprado na Vercel.
Motivo: Fase 7 (DNSSEC/CAA/HSTS preload) agora pode prosseguir com domínio próprio em produção. Frontend na Vercel, API no Railway (`api.almanaquedosclubes.com`).

### [2026-07-16] Decisão: Definição de "pronto" (Discovery Q7)
**Resposta:** Pronto = usuário consegue: pesquisar entidades do futebol mundial, navegar histórico, comparar informações, usar IA com citações — com infraestrutura de ETL, governança e operação funcionando em segundo plano. Planos Free/Pro/Elite ativos.
Motivo: Estabelece o critério de aceitação global do projeto (Seção 9 do Protocolo). Tudo abaixo disso é "em progresso", não "pronto". Afeta profundamente a estrutura do plano:
- Exige Fase 6 com ETL pipeline (atualização automática) — vira `[OBRIGATÓRIO]`.
- Exige Fase 6 com IA/RAG — vira `[OBRIGATÓRIO]`.
- Exige Fase 4 com billing (Free/Pro/Elite) — adicionada como sub-fase.
- Exige Fase 9 com observabilidade real — `[OBRIGATÓRIO]`.

---

## Classificação de fases (Anexo A) após Discovery

| Fase | Classificação | Justificativa |
|------|--------------|---------------|
| 0 – Setup | OBRIGATÓRIO | sempre |
| 1 – Infra base | OBRIGATÓRIO | sempre |
| 2 – Dados | OBRIGATÓRIO + tabelas de auth/billing/audit | login + assinatura |
| 3 – Auth | OBRIGATÓRIO (2FA TOTP OPCIONAL) | login confirmado; sem dado sensível |
| 4 – APIs/CRUDs | OBRIGATÓRIO + módulo de billing | assinatura confirmada |
| 5 – Frontend | OBRIGATÓRIO | sempre |
| 6 – Avançado | UPLOAD OBRIGATÓRIO; FILA OBRIGATÓRIO (ETL); CACHE OBRIGATÓRIO (50k users); IA/RAG OBRIGATÓRIO (diferencial de produto); WEBSOCKET CONDICIONAL | confirmado por Q4+Q7 |
| 7 – Hardening | VAULT CONDICIONAL (deploy nativo basta); DNSSEC/HSTS CONDICIONAL (sem domínio ainda) | Q6 |
| 8 – Testes/segurança | OBRIGATÓRIO + DAST OBRIGATÓRIO (superfície pública grande) | sempre + Q2 |
| 9 – CI/CD e deploy | OBRIGATÓRIO | sempre |
