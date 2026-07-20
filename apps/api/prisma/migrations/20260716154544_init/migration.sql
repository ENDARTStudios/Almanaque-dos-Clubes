-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "shortName" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "foundedYear" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "primaryColor" TEXT,
    "website" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "shortName" TEXT,
    "birthDate" DATETIME,
    "country" TEXT,
    "position" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "type" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "clubs_country_idx" ON "clubs"("country");

-- CreateIndex
CREATE INDEX "clubs_city_idx" ON "clubs"("city");

-- CreateIndex
CREATE INDEX "clubs_status_idx" ON "clubs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_name_country_key" ON "clubs"("name", "country");

-- CreateIndex
CREATE INDEX "players_country_idx" ON "players"("country");

-- CreateIndex
CREATE INDEX "players_birthDate_idx" ON "players"("birthDate");
