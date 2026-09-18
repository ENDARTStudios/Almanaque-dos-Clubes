-- T445 — Direitos do titular (LGPD art. 18) + copyright claims.
-- Reversível: DROP TABLE privacy_requests; DROP TABLE copyright_claims;
-- GRANTs: create_app_user.sql (mesmo PR — regra grants). RLS: sem policies
-- (tabelas de workflow interno; acesso via SERVICE/admin e rotas autenticadas).

CREATE TABLE "privacy_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT,
    "email" TEXT NOT NULL,
    "rightType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recebido',
    "token" TEXT,
    "slaDueAt" TIMESTAMP(3) NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "deferredUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_requests_token_key" ON "privacy_requests"("token");
CREATE INDEX "privacy_requests_email_idx" ON "privacy_requests"("email");
CREATE INDEX "privacy_requests_status_slaDueAt_idx" ON "privacy_requests"("status", "slaDueAt");

CREATE TABLE "copyright_claims" (
    "id" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "fundament" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recebida',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "copyright_claims_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "copyright_claims_status_idx" ON "copyright_claims"("status");
