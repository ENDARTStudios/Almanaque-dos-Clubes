-- T436 — WS-L 1ª camada: prova de consentimento de cookies (LGPD).
-- Reversível: rollback em docs/evidence/t436-rollback.sql
--   (DROP TABLE "cookie_consents"; DROP TABLE "cookie_policy_versions";)

-- CreateTable
CREATE TABLE "cookie_consents" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "cookie_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cookie_policy_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cookie_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cookie_policy_versions_version_key" ON "cookie_policy_versions"("version");

-- CreateIndex
CREATE INDEX "cookie_consents_visitorId_idx" ON "cookie_consents"("visitorId");

-- CreateIndex
CREATE INDEX "cookie_consents_version_idx" ON "cookie_consents"("version");

-- CreateIndex
CREATE INDEX "cookie_consents_consentedAt_idx" ON "cookie_consents"("consentedAt");
