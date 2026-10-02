-- =============================================================================
-- T426 — sourceUrl canônico de auditabilidade (D-2026-09-07-proveniencia-convencional)
-- Adiciona `sourceUrl` (TEXT, opcional) a clubs/players/competitions/stadiums.
-- Match já possui `sourceUrl` (migration 20260905_deep_data_match_provenance).
-- Campo opcional: Wikidata nem sempre expõe URL pública por entidade — ausência
-- é dado, não defeito (sem NOT NULL, sem adivinhar URL).
--
-- Nota: o CI aplica schema via `prisma db push` (não `migrate deploy`); este
-- arquivo documenta a mudança de forma versionada e reversível (ver down.sql).
-- =============================================================================

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
