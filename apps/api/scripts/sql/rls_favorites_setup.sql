-- T439 — RLS (ENABLE + FORCE) e policies owner-only em favorites.
-- Mesmo padrão de rls_sessions_setup.sql. Idempotente.
-- Acesso à API SEMPRE via withRlsContext (service/r favorites).

ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_owner_select" ON "favorites";
CREATE POLICY "favorites_owner_select" ON "favorites"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "favorites_service_select" ON "favorites";
CREATE POLICY "favorites_service_select" ON "favorites"
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "favorites_insert_owner" ON "favorites";
CREATE POLICY "favorites_insert_owner" ON "favorites"
  FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "favorites_update_owner" ON "favorites";
CREATE POLICY "favorites_update_owner" ON "favorites"
  FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "favorites_update_service" ON "favorites";
CREATE POLICY "favorites_update_service" ON "favorites"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "favorites_delete_owner" ON "favorites";
CREATE POLICY "favorites_delete_owner" ON "favorites"
  FOR DELETE USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "favorites_delete_service" ON "favorites";
CREATE POLICY "favorites_delete_service" ON "favorites"
  FOR DELETE USING (current_setting('app.current_user_role', true) = 'SERVICE');
