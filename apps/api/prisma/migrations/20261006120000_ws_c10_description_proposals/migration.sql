-- CreateTable
CREATE TABLE "ClubDescriptionProposal" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "userDescription" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "ClubDescriptionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubDescriptionProposal_clubId_createdAt_idx" ON "ClubDescriptionProposal"("clubId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ClubDescriptionProposal_proposedBy_clubId_idx" ON "ClubDescriptionProposal"("proposedBy", "clubId");

-- AddForeignKey
ALTER TABLE "ClubDescriptionProposal" ADD CONSTRAINT "ClubDescriptionProposal_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubDescriptionProposal" ADD CONSTRAINT "ClubDescriptionProposal_proposedBy_fkey" FOREIGN KEY ("proposedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubDescriptionProposal" ADD CONSTRAINT "ClubDescriptionProposal_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- WS-C-10 — CHECKs de domínio (invisíveis ao datamodel Prisma, como o GIST do T430)
ALTER TABLE "ClubDescriptionProposal" ADD CONSTRAINT "proposal_desc_len" CHECK (length("userDescription") <= 2000);
ALTER TABLE "ClubDescriptionProposal" ADD CONSTRAINT "proposal_status" CHECK (status IN ('pending', 'approved', 'rejected'));
