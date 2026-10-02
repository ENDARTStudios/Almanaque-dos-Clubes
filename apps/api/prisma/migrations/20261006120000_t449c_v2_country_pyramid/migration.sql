-- T449c-v2 — escopo de ranking `country_pyramid` (agregado país+temporada). ADITIVO.
--
-- Adiciona metadados de escopo à tabela `rankings` SEM tocar os rankings por divisão:
--   scope          'division' (implícito/NULL) | 'country_pyramid'
--   country        país do agregado (ex.: 'GB')
--   tierVersion    versão do mapeamento de tier (ex.: t449c-v1-en-pyramid-...)
--   formulaVersion versão da fórmula do agregado (ex.: t449c-v2-country-pyramid-v1)
-- Sem default, sem FK, sem unique. Não altera dados existentes (ficam NULL).
--
-- Reversível (DOWN):
--   DROP INDEX IF EXISTS "rankings_scope_country_season_idx";
--   ALTER TABLE "rankings" DROP COLUMN IF EXISTS "scope", DROP COLUMN IF EXISTS "country",
--     DROP COLUMN IF EXISTS "tierVersion", DROP COLUMN IF EXISTS "formulaVersion";
--
-- Idempotente (IF NOT EXISTS). Sem GRANT novo (app_user já tem DML em rankings).

-- AlterTable
ALTER TABLE "rankings" ADD COLUMN IF NOT EXISTS "scope" TEXT;
ALTER TABLE "rankings" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "rankings" ADD COLUMN IF NOT EXISTS "tierVersion" TEXT;
ALTER TABLE "rankings" ADD COLUMN IF NOT EXISTS "formulaVersion" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_scope_country_season_idx" ON "rankings"("scope", "country", "season");
