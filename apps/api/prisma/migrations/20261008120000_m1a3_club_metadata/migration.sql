-- WS-D M1a-3 — proveniência de coordenadas geocodificadas (aditivo).
--
-- `clubs.metadata` = JSONB livre (ex.: { coordSource, coordPrecision, coordResolvedAt }).
-- Usado para distinguir coordenada exata (estádio/sede) de centroide de município,
-- sem poluir `importedFrom`/`sourceUrl` (proveniência da INGESTÃO, não do enriquecimento).
-- NULL = sem metadados. Não altera linhas existentes. Sem default, sem unique, sem FK, sem índice.
--
-- Reversível (DOWN):
--   ALTER TABLE "clubs" DROP COLUMN IF EXISTS "metadata";
--
-- Idempotente (IF NOT EXISTS). Sem GRANT novo (app_user já tem DML em clubs).
-- RLS: sem policies em clubs.

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
