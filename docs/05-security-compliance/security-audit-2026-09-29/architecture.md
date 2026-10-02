# Architecture — Security Audit 2026-09-29 (Passada 1, estática)

> Escopo: recon + caça estática da superfície pública. Método: leitura de código guiada pelo grafo
> `graft/`, sem execução de ataques, sem tráfego a produção. Referências são `arquivo:linha` no
> commit corrente da worktree. Perfil: `quick` (uma onda de caça, prioridade na superfície geo/WS-C-3).

## Produto, principais e autoridade

Almanaque dos Clubes — plataforma de pesquisa histórica de futebol (clubes, competições, rankings,
títulos). Monorepo pnpm: `apps/api` (Fastify + Prisma + Postgres + Redis opcional, deploy Railway),
`apps/web` (Next.js 16, deploy Vercel), `apps/worker` (email/ETL), `packages/domain` (schemas Zod).

Principais: (1) visitante anônimo — leitura pública de catálogo/mapa/busca; (2) usuário autenticado
via cookie httpOnly `access_token` (JWT HS256, 15min) + `refresh_token` (7d, SameSite=strict,
`apps/api/src/modules/auth/jwt.service.ts:93-99`); (3) operador/CRON — `/admin/backup` por segredo
compartilhado `x-backup-secret`; (4) CI — ingestão Wikidata/Nominatim via scripts CLI.

## Superfície auditada (entrada anônima)

API Fastify (prefixo `/api/v1`, `apps/api/src/app.ts:184-229`), rotas de leitura pública:
`GET /health`, `GET /metrics`, `GET /rankings` + `/rankings/entries` + `/rankings/clube/:clubId`,
`GET /champions` + `/champions/carousel`, `GET /search/global`, `GET /clubs`, `/clubs/geo-stats`,
`/clubs/:id`, `/clubs/:id/geo`, `/clubs/:id/profile`, `/clubs/:id/titles`, `GET /geo/points`,
`GET /docs` (Swagger UI). Escrita anômala: `POST /clubs` (sem `authenticate` — ver F-01).
`POST /admin/backup` (segredo dedicado, isenta de CSRF).

Web: página pública `/map` (`apps/web/src/app/map/page.tsx`) consumindo `/geo/points`;
páginas de detalhe com JSON-LD via `dangerouslySetInnerHTML`; headers em `apps/web/next.config.ts:17-37`
(não há `middleware.ts` — headers são estáticos do next.config).

Ingestão (CLI operator-side, não exposta): `apps/api/scripts/*` (Wikidata), `apps/api/src/lib/geocoding/`
(Nominatim — máx 1 req/s, endpoints fixos), `apps/api/src/lib/rsssf/*`, `apps/api/src/lib/wikidata/*`
(QIDs filtrados por `/^Q\d+$/` antes de fetch).

## Controles de fronteira (mais forte visível em fonte)

- **Rate limit global**: `@fastify/rate-limit` 100/min por `request.ip` (`app.ts:88-101`), chave de
  auth por usuário+IP com janela deslizante Redis→memória (`config/rate-limit.ts`); desligável só
  fora de produção (`config/http-hardening.ts:81-88`).
- **CSRF**: token de uso único emitido anonimamente por `GET /auth/csrf-token`
  (`middleware/csrf.ts:53-66`, `modules/auth/auth.routes.ts:71-83`), exigido em POST/PUT/PATCH/DELETE
  fora de prefixes isentos.
- **CORS**: allowlist explícita de origens + regex `*.vercel.app`, `credentials: true` (`app.ts:152-168`).
- **Erro padronizado**: 500 genérico em produção, 413 sem stack (`app.ts:55-71`); handlers por módulo.
- **Headers web**: XFO DENY, nosniff, Referrer-Policy, CSP com `script-src 'self' 'unsafe-inline'
  'unsafe-eval'` (`next.config.ts:22-32`). HSTS ausente do next.config (fato de deploy Vercel).
- **SQL**: `$queryRawUnsafe` somente em `lib/search.ts:38-55` (tabela/colunas fixas de call-site,
  termo parametrizado `$1`, LIKE-escape) e `modules/auth/users-auth.queries.ts:21-27` (parametrizado).
  Sem `$queryRawUnsafe` com input do usuário interpolado. Sem `@fastify/static` (sem path traversal
  de estáticos na API).
- **Comparação de segredos**: helper timing-safe existe (`config/crypto.ts:126-139`) mas não é usado
  em `/admin/backup`.

## Fronteiras de confiança e caminhos fonte→sink relevantes

1. Internet → Fastify query/body → Prisma (parametrizado) → resposta/cache Redis.
2. DB (alimentado por ingestão de terceiros E por `POST /clubs`) → JSON-LD `dangerouslySetInnerHTML`
   (`apps/web/src/app/clubs/[id]/page.tsx:149-153`) → browser.
3. Header `x-backup-secret` → dump completo do banco (incl. emails) → resposta.
4. `X-Forwarded-For` → `request.ip` (`trustProxy: true`) → rate limit + fallback em memória.
5. Header `idempotency-key` → replay global de respostas (`middleware/idempotency.ts`).

## Comparável

Baseline tipo "catálogo público + API read-only" (estilo Wikipedia/Wikidata API): aceita leitura
anônima ampla com rate limit; não aceita escrita anônima. O desvio observado (F-01, F-02) rompe
exatamente essa premissa.

## Limitações e gaps (passada 2)

Não auditados nesta passada: módulos autenticados (auth/login brute-force `rate-limit.service.ts`,
refresh rotation, password reset, billing/webhook Stripe — webhook tem `timingSafeEqual` em
`modules/billing/providers/payment-provider.ts:63`), admin/RBAC, upload/S3 mime+key handling,
export/etl/graph/rag, worker (email/ETL), apps/web server actions, CI workflows (gitleaks,
security-gate), comportamento efetivo de proxies (XFF), e existência de HSTS no edge Vercel.
Sem ledger anterior compatível — cobertura parcial declarada, nunca exaustiva.
