-- T508 (W4) — temporadas de competição: classificação, artilheiro e totais.
-- Migration 100% ADITIVA (tabela nova + 2 colunas de mídia do T509).
CREATE TABLE "competition_seasons" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "competitionId" UUID NOT NULL REFERENCES "competitions"("id") ON DELETE CASCADE,
  "season" VARCHAR(9) NOT NULL,
  "championId" UUID REFERENCES "clubs"("id") ON DELETE SET NULL,
  "runnerUpId" UUID REFERENCES "clubs"("id") ON DELETE SET NULL,
  "totalMatches" INTEGER,
  "totalGoals" INTEGER,
  "topScorer" JSONB,
  "standings" JSONB,
  "sourceUrl" TEXT,
  "importedFrom" TEXT,
  "importedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "competition_seasons_competition_season_key" UNIQUE ("competitionId", "season")
);
CREATE INDEX "competition_seasons_competitionId_idx" ON "competition_seasons"("competitionId");

-- T509 (W6) — troféu da competição e histórico de uniformes do clube.
ALTER TABLE "competitions" ADD COLUMN "trophyImageUrl" TEXT;
ALTER TABLE "clubs" ADD COLUMN "kitHistory" JSONB;
