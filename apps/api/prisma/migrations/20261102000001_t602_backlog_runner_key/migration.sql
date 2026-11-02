-- T602 (correção) — a fila precisa distinguir o ADAPTADOR (br/pl/lib) da FONTE
-- registrada (rsssf), e a mesma temporada existe em várias competições.
--
-- A tabela nasceu vazia em produção (o planejador não gerou item), então a
-- alteração é segura. Ainda assim é aditiva: coluna com default '' e troca de
-- índice único, sem tocar dado existente.

ALTER TABLE "ingest_backlog" ADD COLUMN "runnerKey" TEXT NOT NULL DEFAULT '';

DROP INDEX "ingest_backlog_sourceKey_season_key";

CREATE UNIQUE INDEX "ingest_backlog_sourceKey_competitionQid_season_key"
    ON "ingest_backlog"("sourceKey", "competitionQid", "season");
