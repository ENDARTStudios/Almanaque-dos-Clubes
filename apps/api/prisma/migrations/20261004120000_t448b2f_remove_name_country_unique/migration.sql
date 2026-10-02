-- T448b-2f — Remover o único global (name,country) de `clubs`.
--
-- Motivo (medido): `clubs_name_country_key` impedia coexistirem homônimos nacionais
-- legítimos com QIDs distintos (ex.: Vila Nova Futebol Clube / GO vs / RN; Operário
-- Ferroviário / PR vs Operário FC). A identidade é o QID (`clubs_qid_key` @unique,
-- INTOUCA); nome é display/busca. A integridade passa a ser garantida por
-- validação de negócio contextual (name+country+state+city) na camada de serviço.
--
-- Reversível (DOWN) — recriar o único SOMENTE se não existirem homônimos novos:
--   -- SELECT name,country,COUNT(*) FROM clubs WHERE "deletedAt" IS NULL
--   --   GROUP BY 1,2 HAVING COUNT(*)>1;  -- deve retornar 0 rows
--   DROP INDEX IF EXISTS "clubs_name_country_idx";
--   CREATE UNIQUE INDEX "clubs_name_country_key" ON "clubs"("name","country");
-- Se houver homônimos, o CREATE UNIQUE falha (não corrompe): exigir soft-hide
-- prévio (documentado) antes do downgrade.
--
-- Idempotente (IF EXISTS / IF NOT EXISTS). Sem GRANT novo (app_user já tem DML em clubs;
-- clubs não tem RLS).

DROP INDEX IF EXISTS "clubs_name_country_key";
CREATE INDEX IF NOT EXISTS "clubs_name_country_idx" ON "clubs"("name", "country");
