-- WS-C-12 — generalização polymorphic de favoritos (club | player | competition).
-- Aditiva e reversível: reverter = recriar o índice antigo + DROP das colunas
-- (os dados de clube permanecem intactos — clubId nunca é dropado).

ALTER TABLE "favorites" ADD COLUMN "targetType" TEXT NOT NULL DEFAULT 'club';
ALTER TABLE "favorites" ADD COLUMN "targetId" TEXT;

-- Backfill: todo favorito existente é de clube.
UPDATE "favorites" SET "targetId" = "clubId" WHERE "targetId" IS NULL;

ALTER TABLE "favorites" ALTER COLUMN "targetId" SET NOT NULL;

-- player/competition não têm clube de origem.
ALTER TABLE "favorites" ALTER COLUMN "clubId" DROP NOT NULL;

-- Índice parcial antigo (user+club) sai; entra o user+target (mesma semântica
-- de unicidade de ativo por par, agora por tipo).
DROP INDEX IF EXISTS "favorites_userId_clubId_active_key";
CREATE UNIQUE INDEX "favorites_user_target_active_key" ON "favorites"("userId", "targetType", "targetId") WHERE "deletedAt" IS NULL;

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_target_type_check" CHECK ("targetType" IN ('club', 'player', 'competition'));

CREATE INDEX "favorites_target_idx" ON "favorites"("targetType", "targetId");
CREATE INDEX "favorites_user_type_idx" ON "favorites"("userId", "targetType");
