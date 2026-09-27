-- T449c-v1 — tier/divisão como metadado auditável (aditivo).
--
-- `Competition.level` = degrau na pirâmide nacional (1 = elite). NULL = desconhecido.
-- NÃO altera fórmula, score, posições, normalização, Ranking/RankingEntry/KnowledgeGraph/Club.
-- Sem default, sem unique, sem FK. Reversível por `level = NULL` (dados) ou DROP COLUMN (schema).
--
-- Reversível (DOWN):
--   DROP INDEX IF EXISTS "competitions_level_idx";
--   ALTER TABLE "competitions" DROP COLUMN IF EXISTS "level";
--
-- Idempotente (IF NOT EXISTS). Sem GRANT novo (app_user já tem DML em competitions).
-- RLS: sem policies em competitions.

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "level" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "competitions_level_idx" ON "competitions"("level");
