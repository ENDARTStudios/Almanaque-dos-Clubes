-- WS-C-14 — RLS (ENABLE + FORCE) em "UserActivity". Idempotente.
-- A trilha é PRIVADA: usuário vê só as próprias linhas; escrita própria
-- (quando o tracking ativar pós-WS-L); SERVICE para leitura agregada.
ALTER TABLE "UserActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserActivity" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_activity_select_own" ON "UserActivity";
CREATE POLICY "user_activity_select_own" ON "UserActivity"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "user_activity_insert_own" ON "UserActivity";
CREATE POLICY "user_activity_insert_own" ON "UserActivity"
  FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "user_activity_service_all" ON "UserActivity";
CREATE POLICY "user_activity_service_all" ON "UserActivity"
  FOR ALL USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');
