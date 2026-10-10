-- T508 (W4) — temporadas de competição: classificação, artilheiro e totais.
-- Migration 100% ADITIVA (tabela nova + 2 colunas de mídia do T509).
--
-- Tipos: `String @id @default(uuid())` no Prisma mapeia para TEXT no Postgres
-- (não UUID nativo) — a FK precisa ser TEXT (lição das migrations existentes;
-- o CI pegou isto: "foreign key constraint cannot be implemented", 42804).
CREATE TABLE "CompetitionSeason" (
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
  "importedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompetitionSeason_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompetitionSeason_competitionId_season_key" UNIQUE ("competitionId", "season")
);
CREATE INDEX "CompetitionSeason_competitionId_idx" ON "CompetitionSeason"("competitionId");
ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_championId_fkey"
  FOREIGN KEY ("championId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_runnerUpId_fkey"
  FOREIGN KEY ("runnerUpId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- T509 (W6) — troféu da competição e histórico de uniformes do clube.
ALTER TABLE "competitions" ADD COLUMN "trophyImageUrl" TEXT;
ALTER TABLE "clubs" ADD COLUMN "kitHistory" JSONB;
