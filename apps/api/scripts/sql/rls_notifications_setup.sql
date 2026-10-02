-- WS-C-8 — RLS (ENABLE + FORCE) e policies owner-only em notifications.
-- Mesmo padrão de rls_favorites_setup.sql. Idempotente.
-- Acesso à API SEMPRE via withRlsContext (notification.service).
-- SERVICE insere (ETL/crons geram notificações); owner lê/marca lida.

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_owner_select" ON "notifications";
CREATE POLICY "notifications_owner_select" ON "notifications"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "notifications_service_select" ON "notifications";
CREATE POLICY "notifications_service_select" ON "notifications"
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "notifications_insert_service" ON "notifications";
CREATE POLICY "notifications_insert_service" ON "notifications"
  FOR INSERT WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "notifications_update_owner" ON "notifications";
CREATE POLICY "notifications_update_owner" ON "notifications"
  FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "notifications_update_service" ON "notifications";
CREATE POLICY "notifications_update_service" ON "notifications"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');
