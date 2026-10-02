-- WS-C-8 — notificações de usuário (aditiva reversível).
--
-- Uma linha por evento relevante para o usuário (new_title, new_competition,
-- ranking_change, system). payload JSONB — shape por type no service
-- (notification.service.ts). `read` + `readAt` para badge/histórico.
-- SQL gerado pelo próprio Prisma (migrate diff --from-empty) para NÃO haver
-- drift com o schema (estilo TEXT/TIMESTAMP(3), FK ON UPDATE CASCADE).
-- Zero linhas existentes afetadas (tabela nova). CASCADE no owner.
--
-- Reversível (DOWN):
--   DROP TABLE IF EXISTS "notifications";
--
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
