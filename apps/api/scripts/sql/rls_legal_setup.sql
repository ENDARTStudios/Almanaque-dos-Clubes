-- T470 — RLS (ENABLE + FORCE) e policies owner-scoped em data_subject_requests e
-- copyright_notices. Mesmo padrão de rls_favorites_setup.sql. Idempotente.
--
-- Política: SELECT/INSERT do próprio titular (app_user com app.current_user_id);
-- UPDATE/DELETE APENAS role SERVICE (o app eleva para SERVICE no cancel/admin —
-- evita que app_user altere status/nota interna diretamente). Acesso à API sempre
-- via withRlsContext.

-- data_subject_requests
ALTER TABLE "data_subject_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_subject_requests" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dsr_owner_select" ON "data_subject_requests";
CREATE POLICY "dsr_owner_select" ON "data_subject_requests"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "dsr_service_select" ON "data_subject_requests";
CREATE POLICY "dsr_service_select" ON "data_subject_requests"
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "dsr_owner_insert" ON "data_subject_requests";
CREATE POLICY "dsr_owner_insert" ON "data_subject_requests"
  FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "dsr_service_update" ON "data_subject_requests";
CREATE POLICY "dsr_service_update" ON "data_subject_requests"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "dsr_service_delete" ON "data_subject_requests";
CREATE POLICY "dsr_service_delete" ON "data_subject_requests"
  FOR DELETE USING (current_setting('app.current_user_role', true) = 'SERVICE');

-- copyright_notices
ALTER TABLE "copyright_notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "copyright_notices" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notice_owner_select" ON "copyright_notices";
CREATE POLICY "notice_owner_select" ON "copyright_notices"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "notice_service_select" ON "copyright_notices";
CREATE POLICY "notice_service_select" ON "copyright_notices"
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "notice_owner_insert" ON "copyright_notices";
CREATE POLICY "notice_owner_insert" ON "copyright_notices"
  FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "notice_service_update" ON "copyright_notices";
CREATE POLICY "notice_service_update" ON "copyright_notices"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "notice_service_delete" ON "copyright_notices";
CREATE POLICY "notice_service_delete" ON "copyright_notices"
  FOR DELETE USING (current_setting('app.current_user_role', true) = 'SERVICE');
