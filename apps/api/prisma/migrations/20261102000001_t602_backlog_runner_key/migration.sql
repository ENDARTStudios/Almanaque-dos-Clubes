-- T602 (correção) — a fila precisa distinguir o ADAPTADOR (br/pl/lib) da FONTE
-- registrada (rsssf), e a mesma temporada existe em várias competições.
--
-- A tabela nasceu vazia em produção (o planejador não gerou item), então a
-- alteração é segura. Ainda assim é aditiva: coluna com default '' e troca de
-- índice único, sem tocar dado existente.

-- Sem DEFAULT: o schema Prisma não declara default (um DEFAULT aqui vira drift
-- detectado pelo gate). Backfill explícito e depois NOT NULL.
ALTER TABLE "ingest_backlog" ADD COLUMN "runnerKey" TEXT;
UPDATE "ingest_backlog" SET "runnerKey" = '' WHERE "runnerKey" IS NULL;
ALTER TABLE "ingest_backlog" ALTER COLUMN "runnerKey" SET NOT NULL;

DROP INDEX "ingest_backlog_sourceKey_season_key";

CREATE UNIQUE INDEX "ingest_backlog_sourceKey_competitionQid_season_key"
    ON "ingest_backlog"("sourceKey", "competitionQid", "season");
