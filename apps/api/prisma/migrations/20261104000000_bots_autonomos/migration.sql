-- T-24/28 — INGESTÃO AUTÔNOMA: estado durável + histórico enriquecido dos bots.
--
-- ADITIVA em relação ao T603: cria `bot_states` e ACRESCENTA colunas a `bot_runs`
-- (nenhuma coluna histórica é removida). As rodadas antigas são migradas para o
-- botId = botKey e ganham um BotState correspondente, então a FK pode ser NOT NULL.

CREATE TABLE "bot_states" (
    "id"                  TEXT NOT NULL,
    "domain"              TEXT NOT NULL,
    "label"               TEXT,
    "enabled"             BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt"           TIMESTAMP(3),
    "lastStatus"          TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastMessage"         TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_states_pkey" PRIMARY KEY ("id")
);

-- Backfill: cada chave antiga vira um estado legado (domain='legacy'). O T603
-- registrava várias chaves do mesmo domínio, mas o histórico continua consultável.
INSERT INTO "bot_states" (
    "id", "domain", "label", "enabled", "lastRunAt", "lastStatus",
    "consecutiveFailures", "lastMessage", "createdAt", "updatedAt"
)
SELECT DISTINCT
    "botKey",
    'legacy',
    "botKey",
    true,
    MAX("finishedAt") OVER (PARTITION BY "botKey"),
    NULL,
    0,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "bot_runs"
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "bot_runs" ADD COLUMN "botId" TEXT;
ALTER TABLE "bot_runs" ADD COLUMN "trigger" TEXT NOT NULL DEFAULT 'schedule';
ALTER TABLE "bot_runs" ADD COLUMN "processed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bot_runs" ADD COLUMN "updated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bot_runs" ADD COLUMN "skipped" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bot_runs" ADD COLUMN "errors" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bot_runs" ADD COLUMN "message" TEXT;

UPDATE "bot_runs" SET "botId" = "botKey" WHERE "botId" IS NULL;
ALTER TABLE "bot_runs" ALTER COLUMN "botId" SET NOT NULL;

CREATE INDEX "bot_runs_botId_startedAt_idx" ON "bot_runs"("botId", "startedAt");

ALTER TABLE "bot_runs"
    ADD CONSTRAINT "bot_runs_botId_fkey"
    FOREIGN KEY ("botId") REFERENCES "bot_states"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
