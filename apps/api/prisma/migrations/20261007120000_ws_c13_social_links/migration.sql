-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "followersSnapshot" JSONB,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "socialLinksUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "followersSnapshot" JSONB,
ADD COLUMN     "officialSite" TEXT,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "socialLinksUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "followersSnapshot" JSONB,
ADD COLUMN     "officialSite" TEXT,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "socialLinksUpdatedAt" TIMESTAMP(3);

