-- T602 — FILA DE INGESTÃO CONTÍNUA.
--
-- ADITIVA: tabela nova, nada existente é alterado.
-- GRANT: scripts/sql/create_app_user.sql (mesmo PR — regra grants).

CREATE TABLE "ingest_backlog" (
    "id"             TEXT NOT NULL,
    "sourceKey"      TEXT NOT NULL,
    "season"         TEXT NOT NULL,
    "competitionQid" TEXT,
    "status"         TEXT NOT NULL DEFAULT 'PENDING',
    "reason"         TEXT NOT NULL,
    "attempts"       INTEGER NOT NULL DEFAULT 0,
    "lastError"      TEXT,
    "startedAt"      TIMESTAMP(3),
    "finishedAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingest_backlog_pkey" PRIMARY KEY ("id")
);

-- Idempotência do planejamento: a mesma temporada da mesma fonte não entra duas vezes.
CREATE UNIQUE INDEX "ingest_backlog_sourceKey_season_key"
    ON "ingest_backlog"("sourceKey", "season");

-- Consumo da fila: pendentes mais antigos primeiro.
CREATE INDEX "ingest_backlog_status_createdAt_idx"
    ON "ingest_backlog"("status", "createdAt");
