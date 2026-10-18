-- WS-C-9 Modo Clube (C2/C3) — evidência de vínculo e revisão registrada na posse.
-- ADITIVA: 3 colunas nullable + default de status + índice de moderação.
-- Produção em 15-10-2026: 0 linhas em "ClubOwnership" — sem grandfathering
-- (decisão do Operador); nenhuma linha existente a migrar.
ALTER TABLE "ClubOwnership" ADD COLUMN "evidenceUrl" TEXT;
ALTER TABLE "ClubOwnership" ADD COLUMN "evidenceNote" TEXT;
ALTER TABLE "ClubOwnership" ADD COLUMN "reviewedBy" TEXT;

-- C3 — toda posse nasce 'pending' (revisão humana; o service sempre explicita
-- o status, o default é defesa em profundidade contra insert sem status).
ALTER TABLE "ClubOwnership" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Fila de moderação (admin lista posses pendentes).
CREATE INDEX "ClubOwnership_status_idx" ON "ClubOwnership"("status");
