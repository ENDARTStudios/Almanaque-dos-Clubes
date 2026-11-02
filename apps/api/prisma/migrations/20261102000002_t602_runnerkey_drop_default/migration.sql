-- T602 (correção de drift) — a coluna "runnerKey" nasceu com DEFAULT '' na
-- migration 20261102000001, mas o schema Prisma não declara default. O gate de
-- drift compara os dois e acusa `ALTER COLUMN ... DROP DEFAULT`.
--
-- A migration anterior já foi APLICADA em produção (não se reescreve migration
-- aplicada): o alinhamento vem aqui, com DROP DEFAULT. Idempotente por natureza
-- (DROP DEFAULT sem default é no-op no Postgres).

ALTER TABLE "ingest_backlog" ALTER COLUMN "runnerKey" DROP DEFAULT;
