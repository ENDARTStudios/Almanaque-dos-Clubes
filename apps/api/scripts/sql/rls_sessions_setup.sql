-- T400 — aplica RLS (ENABLE + FORCE) e policies completas em sessions.
-- Consolidado das migrations 20260824_rls_sessions + 20260825_rls_sessions_complete.
-- Idempotente: drop-if-exists antes de cada CREATE POLICY.

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_owner_select" ON "sessions";
CREATE POLICY "sessions_owner_select" ON "sessions"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "sessions_service_select" ON "sessions";
CREATE POLICY "sessions_service_select" ON "sessions"
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "sessions_select_by_token" ON "sessions";
CREATE POLICY "sessions_select_by_token" ON "sessions"
  FOR SELECT USING ("tokenHash" = NULLIF(current_setting('app.current_token_hash', true), ''));

DROP POLICY IF EXISTS "sessions_insert_owner" ON "sessions";
CREATE POLICY "sessions_insert_owner" ON "sessions"
  FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "sessions_update_owner" ON "sessions";
CREATE POLICY "sessions_update_owner" ON "sessions"
  FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "sessions_update_service" ON "sessions";
CREATE POLICY "sessions_update_service" ON "sessions"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "sessions_delete_service" ON "sessions";
CREATE POLICY "sessions_delete_service" ON "sessions"
  FOR DELETE USING (current_setting('app.current_user_role', true) = 'SERVICE');