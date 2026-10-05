-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "userDescription" TEXT,
ADD COLUMN     "userDescriptionSource" TEXT,
ADD COLUMN     "userDescriptionUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClubOwnership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "status" TEXT NOT NULL DEFAULT 'active',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "ClubOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubOwnership_clubId_idx" ON "ClubOwnership"("clubId");

-- CreateIndex
CREATE INDEX "ClubOwnership_userId_idx" ON "ClubOwnership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubOwnership_userId_clubId_key" ON "ClubOwnership"("userId", "clubId");

-- AddForeignKey
ALTER TABLE "ClubOwnership" ADD CONSTRAINT "ClubOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubOwnership" ADD CONSTRAINT "ClubOwnership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

