-- T444 — Log de eventos de pagamento (idempotência de webhook por
-- providerEventId UNIQUE). Adiciona PAST_DUE à máquina de estados de
-- assinatura (falha de cobrança recuperável).
-- Reversível: rollback em docs/evidence/t444-rollback.sql
-- GRANTs: create_app_user.sql (mesmo PR — regra grants). RLS: sem policies
-- (tabela de log interno; acesso só via SERVICE/admin).

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_providerEventId_key" ON "payment_events"("providerEventId");
