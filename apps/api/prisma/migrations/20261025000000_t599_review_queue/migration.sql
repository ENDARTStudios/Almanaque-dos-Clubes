-- T599/DQ-04 — FILA DE REVISÃO de dados: anomalias sinalizadas ANTES de virarem
-- produto. Alimentada pelo integrity-check (idempotente); resolvida por admin.
--
-- ADITIVA: tabela nova, nada existente é alterado.
-- GRANT: create_app_user.sql (mesmo PR — regra grants).

CREATE TABLE "review_queue" (
    "id"             TEXT NOT NULL,
    "entityType"     TEXT NOT NULL,
    "entityId"       TEXT NOT NULL,
    "check"          TEXT NOT NULL,
    "reason"         TEXT NOT NULL,
    "severity"       TEXT NOT NULL DEFAULT 'high',
    "status"         TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedBy"     TEXT,
    "resolvedAt"     TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_queue_pkey" PRIMARY KEY ("id")
);

-- Idempotência do feed: uma checagem por entidade PENDENTE de cada vez.
CREATE UNIQUE INDEX "review_queue_entity_check_pending_key"
    ON "review_queue"("entityType", "entityId", "check")
    WHERE status = 'PENDING';

-- Fila de trabalho do admin: pendentes primeiro, mais graves primeiro.
CREATE INDEX "review_queue_status_severity_createdAt_idx"
    ON "review_queue"("status", "severity", "createdAt");

CREATE INDEX "review_queue_entityType_entityId_idx"
    ON "review_queue"("entityType", "entityId");
