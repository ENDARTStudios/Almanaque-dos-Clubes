-- AlterTable: clubs — add QID + source tracking
ALTER TABLE "clubs" ADD COLUMN "qid" TEXT;
ALTER TABLE "clubs" ADD COLUMN "importedFrom" TEXT;
ALTER TABLE "clubs" ADD COLUMN "importedAt" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "clubs_qid_key" ON "clubs"("qid");

-- AlterTable: players — add QID + source tracking
ALTER TABLE "players" ADD COLUMN "qid" TEXT;
ALTER TABLE "players" ADD COLUMN "importedFrom" TEXT;
ALTER TABLE "players" ADD COLUMN "importedAt" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "players_qid_key" ON "players"("qid");

-- AlterTable: competitions — add QID + source tracking
ALTER TABLE "competitions" ADD COLUMN "qid" TEXT;
ALTER TABLE "competitions" ADD COLUMN "importedFrom" TEXT;
ALTER TABLE "competitions" ADD COLUMN "importedAt" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "competitions_qid_key" ON "competitions"("qid");

-- CreateTable: stadiums
CREATE TABLE "stadiums" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "capacity" INTEGER,
    "surface" TEXT,
    "qid" TEXT,
    "clubId" TEXT,
    "importedFrom" TEXT,
    "importedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "stadiums_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "stadiums_qid_key" ON "stadiums"("qid");

-- CreateIndex
CREATE INDEX "stadiums_clubId_idx" ON "stadiums"("clubId");

-- CreateIndex
CREATE INDEX "stadiums_country_idx" ON "stadiums"("country");

-- AlterTable: matches — add stadium reference
ALTER TABLE "matches" ADD COLUMN "stadiumId" TEXT;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES "stadiums" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "matches_stadiumId_idx" ON "matches"("stadiumId");
