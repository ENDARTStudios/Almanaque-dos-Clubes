-- T508 (W4) — temporadas de competição: classificação, artilheiro e totais.
-- Migration 100% ADITIVA (tabela nova + 2 colunas de mídia do T509).
--
-- Tipos: `String @id @default(uuid())` no Prisma mapeia para TEXT no Postgres
-- (não UUID nativo) — a FK precisa ser TEXT (lição das migrations existentes;
-- o CI pegou isto: "foreign key constraint cannot be implemented", 42804).
CREATE TABLE "competition_seasons" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "season" VARCHAR(9) NOT NULL,
  "championId" TEXT,
  "runnerUpId" TEXT,
  "totalMatches" INTEGER,
  "totalGoals" INTEGER,
  "topScorer" JSONB,
  "standings" JSONB,
  "sourceUrl" TEXT,
  "importedFrom" TEXT,
  "importedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "competition_seasons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "competition_seasons_competition_season_key" UNIQUE ("competitionId", "season")
);
CREATE INDEX "competition_seasons_competitionId_idx" ON "competition_seasons"("competitionId");
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_championId_fkey"
  FOREIGN KEY ("championId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_runnerUpId_fkey"
  FOREIGN KEY ("runnerUpId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- T509 (W6) — troféu da competição e histórico de uniformes do clube.
ALTER TABLE "competitions" ADD COLUMN "trophyImageUrl" TEXT;
ALTER TABLE "clubs" ADD COLUMN "kitHistory" JSONB;
