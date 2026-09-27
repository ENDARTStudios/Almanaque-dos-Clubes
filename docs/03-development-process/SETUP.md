# SETUP.md — Ambiente local

## Pré-requisitos

- Node 22 + pnpm 11 (`corepack enable`)
- Docker (para Postgres/Redis/MinIO)
- Git Bash (Windows) — atenção às armadilhas MSYS anotadas abaixo

## Passos

```bash
pnpm install
# Docker local (Postgres 16 + Redis + MinIO):
docker compose up -d
cd apps/api
npx prisma generate --schema=prisma/schema.prisma   # client PostgreSQL (canônico)
cp .env.example .env                                # ajustar DATABASE_URL etc.
npx prisma db push --schema=prisma/schema.prisma    # cria o schema no banco local
pnpm dev                                            # API em :3000
cd ../web && pnpm dev                               # Web em :3001
```

## Bancos locais

| Container | Porta | Uso |
|---|---|---|
| `almanaque-postgres` | 5432 | dev do dia a dia |
| `almanaque-postgis-test` | **54330** (db `almanaque_test`) | espelho de CI (PostGIS + RLS + app_user) — suíte completa |
| `almanaque-redis` | 6379 | cache/fila local |

### Ordem certa para subir o banco de teste (54330)

1. `create_postgis.sql` (extensão ANTES do push — sem ela o `db push` para no meio)
2. `prisma db push --schema=prisma/schema.prisma`
3. `rls_sessions_setup.sql` → `rls_favorites_setup.sql` → `create_app_user.sql` → `rls_users_setup.sql`

(Arquivos em `apps/api/scripts/sql/`.)

## Armadilhas conhecidas (Windows/MSYS)

- `/tmp/arquivo` no Bash vira `D:\tmp\...` para o Node — use caminho local do repo.
- `docker exec` com caminho `/x` precisa de `MSYS_NO_PATHCONV=1`.
- `corepack`/pnpm: não rodar `npm install` (pnpm-lock é a fonte).
- Dotenv: `apps/api/.env.local` NÃO é carregado pelo dotenv do teste — passe env INLINE.
- SQLite mirror (`schema.sqlite.prisma`) existe para testes rápidos sem Postgres; o canônico é o
  `schema.prisma` (PostgreSQL).

## Verificação de que o ambiente está pronto

```bash
cd apps/api
DATABASE_URL="postgresql://almanaque:<pw>@localhost:54330/almanaque_test" \
TEST_REQUIRE_DB=true npx vitest run tests/integration/champions.test.ts
```

`4 passed` = banco + RLS + schema OK. Falhas em `rls-*`/`favorites`/`consent`/`routes` com DB
vazio/desatualizado = setup local (no CI provisioning é outro e passa).
