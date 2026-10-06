-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewAction" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_createdAt_idx" ON "Report"("targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Report_reporterId_createdAt_idx" ON "Report"("reporterId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- WS-C-11 — CHECKs de domínio (invisíveis ao datamodel Prisma)
ALTER TABLE "Report" ADD CONSTRAINT "report_target_type" CHECK ("targetType" IN ('club_description', 'proposal'));
ALTER TABLE "Report" ADD CONSTRAINT "report_reason" CHECK ("reason" IN ('spam', 'offensive', 'misinformation', 'copyright', 'other'));
ALTER TABLE "Report" ADD CONSTRAINT "report_status" CHECK ("status" IN ('pending', 'resolved', 'dismissed'));
ALTER TABLE "Report" ADD CONSTRAINT "report_review_action" CHECK ("reviewAction" IN ('remove_content', 'warn_user', 'suspend_user', 'no_action'));
