# apps/api — API Almanaque dos Clubes

Fastify 5 + Prisma + PostgreSQL. Produção no Railway (Dockerfile próprio + healthcheck gate em `/api/v1/health`).

## Comandos

```bash
pnpm dev            # dev server (watch)
pnpm build          # tsc → dist/
pnpm test           # vitest (unit + integração; requer Postgres)
pnpm typecheck      # tsc --noEmit (orquestrado pelo turbo na raiz)

pnpm prisma:generate
pnpm prisma:migrate # migrate dev
pnpm prisma:seed
pnpm prisma:studio
```

## Schemas Prisma (dual-client)

- `prisma/schema.prisma` — **PostgreSQL, canônico** (produção/CI/Docker).
- `prisma/schema.sqlite.prisma` — espelho SQLite para sandbox local.

Armadilha conhecida: após gerar o client SQLite, **regerar o client Postgres** antes de
`pnpm typecheck` — os tipos divergem. Detalhes em `docs/AGENTS.md`.

## Banco local

- SQLite sandbox: `apps/api/.env.local` (padrão local).
- Postgres: `docker compose up -d postgres` na raiz + `DATABASE_URL` apontando para ele.

## Produção

- Deploy automático no merge à main (Railway); fingerprint via
  `railway ssh ... printenv RAILWAY_GIT_COMMIT_SHA`.
- Migrations aplicadas no boot pelo `entrypoint.sh` (fail-fast).
- RLS ativa em produção (`scripts/sql/rls_*.sql`); `DATABASE_URL` (owner) vs
  `DATABASE_URL_APP` (app_user com RLS).
