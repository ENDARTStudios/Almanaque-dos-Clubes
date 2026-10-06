-- WS-C-12 fix — renomeia índices para os nomes que o Prisma espera
-- (declarados via @@index no schema; nomes custom geravam drift).
ALTER INDEX "favorites_target_idx" RENAME TO "favorites_targetType_targetId_idx";
ALTER INDEX "favorites_user_type_idx" RENAME TO "favorites_userId_targetType_idx";
