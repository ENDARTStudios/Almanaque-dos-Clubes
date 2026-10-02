-- Match: proveniência + chave estável de dedup (T420 deep-data-matches)
ALTER TABLE "matches" ADD COLUMN "qid" TEXT UNIQUE;
ALTER TABLE "matches" ADD COLUMN "importedFrom" TEXT;
ALTER TABLE "matches" ADD COLUMN "importedAt" TIMESTAMP(3);
ALTER TABLE "matches" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "matches" ADD COLUMN "license" TEXT;
ALTER TABLE "matches" ADD COLUMN "dedupKey" TEXT UNIQUE;

-- Índices para consulta de resultados (Ranking 0-100) e filtros por clube/competição/temporada
CREATE INDEX IF NOT EXISTS "matches_importedFrom_idx" ON "matches"("importedFrom");
CREATE INDEX IF NOT EXISTS "matches_dedupKey_idx" ON "matches"("dedupKey");
