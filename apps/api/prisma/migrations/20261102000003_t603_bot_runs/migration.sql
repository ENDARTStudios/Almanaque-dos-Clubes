-- T603 — SISTEMA DE BOTS: histórico de execuções.
--
-- ADITIVA: tabela nova. GRANT em scripts/sql/create_app_user.sql (mesmo PR).

CREATE TABLE "bot_runs" (
    "id"           TEXT NOT NULL,
    "botKey"       TEXT NOT NULL,
    "status"       TEXT NOT NULL,
    "startedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"   TIMESTAMP(3),
    "durationMs"   INTEGER,
    "metricBefore" INTEGER,
    "metricAfter"  INTEGER,
    "delta"        INTEGER,
    "error"        TEXT,
    "triggeredBy"  TEXT,

    CONSTRAINT "bot_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bot_runs_botKey_startedAt_idx" ON "bot_runs"("botKey", "startedAt");
CREATE INDEX "bot_runs_status_startedAt_idx" ON "bot_runs"("status", "startedAt");
