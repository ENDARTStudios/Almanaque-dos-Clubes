-- T466 — Geografia: hierarquia Continent → Country → State → City.
-- Autônomo (fontes abertas / Wikidata). Coordenadas em Float (PostGIS NÃO é exigido;
-- a produção não tem os binários do PostGIS — ver 20260905_stadiums_postgis).
-- Chaves de dedup: countries.iso2 (P297) · states.code (ISO 3166-2 / P300) · cities.qid (P131).
-- FKs em clubs/stadiums são NULLABLE (aditivas; não reescrevem as 3.857 linhas).
--
-- Reversível:
--   ALTER TABLE "clubs"    DROP CONSTRAINT "clubs_cityId_fkey",    DROP CONSTRAINT "clubs_stateId_fkey",    DROP CONSTRAINT "clubs_countryId_fkey";
--   ALTER TABLE "clubs"    DROP COLUMN "cityId",   DROP COLUMN "stateId",   DROP COLUMN "countryId";
--   ALTER TABLE "stadiums" DROP CONSTRAINT "stadiums_cityId_fkey", DROP CONSTRAINT "stadiums_stateId_fkey", DROP CONSTRAINT "stadiums_countryId_fkey";
--   ALTER TABLE "stadiums" DROP COLUMN "cityId",   DROP COLUMN "stateId",   DROP COLUMN "countryId";
--   DROP TABLE "cities"; DROP TABLE "states"; DROP TABLE "countries";
--
-- GRANTs: scripts/sql/create_app_user.sql (mesmo PR — regra grants).
-- RLS: sem policies (tabelas de referência pública; leitura ampla, escrita por ETL/service).

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "stateId" TEXT;

-- AlterTable
ALTER TABLE "stadiums" ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "stateId" TEXT;

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "iso2" CHAR(2) NOT NULL,
    "iso3" CHAR(3),
    "name" TEXT NOT NULL,
    "continent" VARCHAR(2),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "qid" TEXT,
    "importedFrom" TEXT,
    "importedAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "qid" TEXT,
    "importedFrom" TEXT,
    "importedAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "qid" TEXT,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "stateId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "importedFrom" TEXT,
    "importedAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso2_key" ON "countries"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "countries_qid_key" ON "countries"("qid");

-- CreateIndex
CREATE INDEX "countries_continent_idx" ON "countries"("continent");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "states_qid_key" ON "states"("qid");

-- CreateIndex
CREATE INDEX "states_countryId_idx" ON "states"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "cities_qid_key" ON "cities"("qid");

-- CreateIndex
CREATE INDEX "cities_countryId_idx" ON "cities"("countryId");

-- CreateIndex
CREATE INDEX "cities_stateId_idx" ON "cities"("stateId");

-- CreateIndex
CREATE INDEX "clubs_countryId_idx" ON "clubs"("countryId");

-- CreateIndex
CREATE INDEX "clubs_stateId_idx" ON "clubs"("stateId");

-- CreateIndex
CREATE INDEX "clubs_cityId_idx" ON "clubs"("cityId");

-- CreateIndex
CREATE INDEX "stadiums_countryId_idx" ON "stadiums"("countryId");

-- CreateIndex
CREATE INDEX "stadiums_stateId_idx" ON "stadiums"("stateId");

-- CreateIndex
CREATE INDEX "stadiums_cityId_idx" ON "stadiums"("cityId");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stadiums" ADD CONSTRAINT "stadiums_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stadiums" ADD CONSTRAINT "stadiums_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stadiums" ADD CONSTRAINT "stadiums_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
