-- WS-C-8 — notificações de usuário (aditiva reversível).
--
-- Uma linha por evento relevante para o usuário (new_title, new_competition,
-- ranking_change, system). payload JSONB — shape por type no service
-- (notification.service.ts). `read` + `readAt` para badge/histórico.
-- Zero linhas existentes afetadas (tabela nova). Sem hard delete de usuário:
-- notificações caem com ON DELETE CASCADE do owner.
--
-- Reversível (DOWN):
--   DROP TABLE IF EXISTS "notifications";
--
CREATE TABLE "notifications" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "readAt" TIMESTAMPTZ
);

CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
