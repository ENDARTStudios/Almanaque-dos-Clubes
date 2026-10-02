-- T439 — Favoritos do usuário (WS-C 2ª camada).
-- Soft-delete (deletedAt); índice parcial único impede duplicata de favorito
-- ativo mas permite re-favoritar após remoção.
-- Reversível: rollback em docs/evidence/t439-rollback.sql
--   (DROP TABLE "favorites";)
-- GRANT ao app_user: apps/api/scripts/sql/create_app_user.sql (mesmo PR —
-- regra D-2026-09-15-migration-grants-rule). Policies RLS fora de migrations:
-- scripts/sql/rls_favorites_setup.sql.

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "notificationsActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");

-- CreateIndex
CREATE INDEX "favorites_clubId_idx" ON "favorites"("clubId");

-- CreateIndex
CREATE INDEX "favorites_userId_deletedAt_idx" ON "favorites"("userId", "deletedAt");

-- Índice parcial único: um único favorito ATIVO por (usuário, clube).
CREATE UNIQUE INDEX "favorites_userId_clubId_active_key" ON "favorites"("userId", "clubId") WHERE "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
