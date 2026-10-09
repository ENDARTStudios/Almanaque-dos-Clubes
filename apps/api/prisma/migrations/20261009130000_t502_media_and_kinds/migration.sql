-- T502 (mapeamento do portal, Operador 09/10) — mídia visual + seleções nacionais.
-- Migration 100% ADITIVA: nenhuma linha é reescrita, nenhuma coluna é removida.

-- W1/W3 — mídia e identidade de clubes (inclui seleções nacionais)
ALTER TABLE "clubs" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "clubs" ADD COLUMN "teamColors" JSONB;
ALTER TABLE "clubs" ADD COLUMN "stadiumName" TEXT;
ALTER TABLE "clubs" ADD COLUMN "stadiumImage" TEXT;
ALTER TABLE "clubs" ADD COLUMN "stadiumCapacity" INTEGER;
ALTER TABLE "clubs" ADD COLUMN "stadiumLat" DOUBLE PRECISION;
ALTER TABLE "clubs" ADD COLUMN "stadiumLng" DOUBLE PRECISION;
ALTER TABLE "clubs" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'club';
ALTER TABLE "clubs" ADD COLUMN "federation" TEXT;

-- W2 — foto do jogador (P18). Demais campos (position/country/birthDate/clubId)
-- já existem desde T034.
ALTER TABLE "players" ADD COLUMN "photoUrl" TEXT;
