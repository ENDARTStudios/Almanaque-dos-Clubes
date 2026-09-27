-- T448b-2i — soft-delete de competições duplicadas (aditivo). Identidade canônica = qid.
--
-- Adiciona `deletedAt`/`deletionReason` a `competitions` (nullable). NÃO toca rankings/entries/
-- knowledge_graph/clubs. Não altera dados existentes (ficam NULL). Reversível.
--
-- Reversível (DOWN):
--   DROP INDEX IF EXISTS "competitions_deletedAt_idx";
--   ALTER TABLE "competitions" DROP COLUMN IF EXISTS "deletionReason";
--   ALTER TABLE "competitions" DROP COLUMN IF EXISTS "deletedAt";
--
-- Idempotente (IF NOT EXISTS).

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "deletionReason" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "competitions_deletedAt_idx" ON "competitions"("deletedAt");
