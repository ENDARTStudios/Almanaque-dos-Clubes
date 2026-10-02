-- T470 — WS-L: direitos do titular (LGPD art. 18) + notificação autoral
-- (Lei 9.610/98 + análoga; SEM safe harbor formal). Fluxo autenticado com protocolo.
-- Aditiva e reversível (ver bloco final). Espelho SQLite em schema.sqlite.prisma
-- (enums→String, Json→String) — NÃO aplicado aqui (esta migration é PG-only).
--
-- Reversível:
--   ALTER TABLE "users" DROP COLUMN "deletedAt";
--   DROP TABLE "copyright_notices"; DROP TABLE "data_subject_requests";
--   DROP TYPE "CopyrightNoticeStatus"; DROP TYPE "CopyrightNoticeType";
--   DROP TYPE "DsrStatus"; DROP TYPE "DsrJurisdiction"; DROP TYPE "DsrType";
--
-- GRANTs/RLS: aplicados aqui (PG) de forma idempotente; CI usa db push +
-- scripts/sql/rls_legal_setup.sql + create_app_user.sql (mesmas instruções).

-- CreateEnum
CREATE TYPE "DsrType" AS ENUM ('confirmation_access', 'correction', 'anonymization_blockage_deletion', 'portability', 'sharing_information', 'consent_revocation', 'objection', 'automated_decision_review');

-- CreateEnum
CREATE TYPE "DsrJurisdiction" AS ENUM ('BR', 'EEA_UK', 'OTHER');

-- CreateEnum
CREATE TYPE "DsrStatus" AS ENUM ('received', 'needs_verification', 'in_progress', 'completed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "CopyrightNoticeType" AS ENUM ('infringement_notice', 'counter_notice');

-- CreateEnum
CREATE TYPE "CopyrightNoticeStatus" AS ENUM ('received', 'under_review', 'action_taken', 'rejected', 'closed');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "data_subject_requests" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DsrType" NOT NULL,
    "jurisdiction" "DsrJurisdiction" NOT NULL DEFAULT 'BR',
    "status" "DsrStatus" NOT NULL DEFAULT 'received',
    "description" TEXT,
    "requestedFields" JSONB,
    "deadlineAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "responseSummary" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copyright_notices" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "type" "CopyrightNoticeType" NOT NULL,
    "status" "CopyrightNoticeStatus" NOT NULL DEFAULT 'received',
    "userId" TEXT NOT NULL,
    "originalNoticeId" TEXT,
    "workTitle" TEXT NOT NULL,
    "workUrl" TEXT,
    "materialUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goodFaithDeclaration" BOOLEAN NOT NULL,
    "accuracyDeclaration" BOOLEAN NOT NULL,
    "signatureText" TEXT NOT NULL,
    "jurisdiction" "DsrJurisdiction" NOT NULL DEFAULT 'BR',
    "responseSummary" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "copyright_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_subject_requests_protocol_key" ON "data_subject_requests"("protocol");

-- CreateIndex
CREATE INDEX "data_subject_requests_userId_idx" ON "data_subject_requests"("userId");

-- CreateIndex
CREATE INDEX "data_subject_requests_status_idx" ON "data_subject_requests"("status");

-- CreateIndex
CREATE INDEX "data_subject_requests_type_idx" ON "data_subject_requests"("type");

-- CreateIndex
CREATE INDEX "data_subject_requests_deadlineAt_idx" ON "data_subject_requests"("deadlineAt");

-- CreateIndex
CREATE INDEX "data_subject_requests_protocol_idx" ON "data_subject_requests"("protocol");

-- CreateIndex
CREATE UNIQUE INDEX "copyright_notices_protocol_key" ON "copyright_notices"("protocol");

-- CreateIndex
CREATE INDEX "copyright_notices_userId_idx" ON "copyright_notices"("userId");

-- CreateIndex
CREATE INDEX "copyright_notices_status_idx" ON "copyright_notices"("status");

-- CreateIndex
CREATE INDEX "copyright_notices_type_idx" ON "copyright_notices"("type");

-- CreateIndex
CREATE INDEX "copyright_notices_originalNoticeId_idx" ON "copyright_notices"("originalNoticeId");

-- CreateIndex
CREATE INDEX "copyright_notices_protocol_idx" ON "copyright_notices"("protocol");

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copyright_notices" ADD CONSTRAINT "copyright_notices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copyright_notices" ADD CONSTRAINT "copyright_notices_originalNoticeId_fkey" FOREIGN KEY ("originalNoticeId") REFERENCES "copyright_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- T470 — GRANTs (idempotente; só se a role app_user existir) + RLS owner-scoped.
-- Mesmas instruções de scripts/sql/rls_legal_setup.sql (CI/dev) — mantidas em sincronia.
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "data_subject_requests" TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "copyright_notices" TO app_user;
  END IF;
END $$;

ALTER TABLE "data_subject_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_subject_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dsr_owner_select" ON "data_subject_requests";
CREATE POLICY "dsr_owner_select" ON "data_subject_requests"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));
DROP POLICY IF EXISTS "dsr_service_select" ON "data_subject_requests";
CREATE POLICY "dsr_service_select" ON "data_subject_requests"
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'SERVICE');
DROP POLICY IF EXISTS "dsr_owner_insert" ON "data_subject_requests";
CREATE POLICY "dsr_owner_insert" ON "data_subject_requests"
  FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');
DROP POLICY IF EXISTS "dsr_service_update" ON "data_subject_requests";
CREATE POLICY "dsr_service_update" ON "data_subject_requests"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');
DROP POLICY IF EXISTS "dsr_service_delete" ON "data_subject_requests";
CREATE POLICY "dsr_service_delete" ON "data_subject_requests"
  FOR DELETE USING (current_setting('app.current_user_role', true) = 'SERVICE');

ALTER TABLE "copyright_notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "copyright_notices" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notice_owner_select" ON "copyright_notices";
CREATE POLICY "notice_owner_select" ON "copyright_notices"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));
DROP POLICY IF EXISTS "notice_service_select" ON "copyright_notices";
CREATE POLICY "notice_service_select" ON "copyright_notices"
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'SERVICE');
DROP POLICY IF EXISTS "notice_owner_insert" ON "copyright_notices";
CREATE POLICY "notice_owner_insert" ON "copyright_notices"
  FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');
DROP POLICY IF EXISTS "notice_service_update" ON "copyright_notices";
CREATE POLICY "notice_service_update" ON "copyright_notices"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');
DROP POLICY IF EXISTS "notice_service_delete" ON "copyright_notices";
CREATE POLICY "notice_service_delete" ON "copyright_notices"
  FOR DELETE USING (current_setting('app.current_user_role', true) = 'SERVICE');
