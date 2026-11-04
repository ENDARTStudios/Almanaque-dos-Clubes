-- #808 — a migration de bots autônomos criou as tabelas mas não o índice
-- `@@index([status])` declarado no schema (migration-drift acusou
-- `CREATE INDEX "bot_runs_status_idx"`). Aditiva e idempotente.
CREATE INDEX IF NOT EXISTS "bot_runs_status_idx" ON "bot_runs"("status");
