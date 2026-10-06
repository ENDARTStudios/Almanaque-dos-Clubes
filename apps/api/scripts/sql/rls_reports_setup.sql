-- WS-C-11 — RLS (ENABLE + FORCE) em "Report". Idempotente.
-- Regras: reporter vê SOMENTE as suas; criação própria; moderação (SELECT
-- completo + UPDATE resolve/dismiss) roda como SERVICE na API após o gate de
-- permissão reports:moderate no código (RLS = defesa em profundidade).
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_own" ON "Report";
CREATE POLICY "reports_select_own" ON "Report"
  FOR SELECT USING ("reporterId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "reports_insert" ON "Report";
CREATE POLICY "reports_insert" ON "Report"
  FOR INSERT WITH CHECK ("reporterId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "reports_update_service" ON "Report";
CREATE POLICY "reports_update_service" ON "Report"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

-- Lista de pendentes para moderação: SECURITY DEFINER (join users+clubs sem
-- GRANT para app_user; T442) com contagem por target (prioridade).
CREATE OR REPLACE FUNCTION reports_pending_list()
RETURNS TABLE (
  id text,
  "reporterId" text,
  reporter_name text,
  "targetType" text,
  "targetId" text,
  target_club_name text,
  reason text,
  details text,
  "createdAt" timestamp(3),
  report_count bigint
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    r.id, r."reporterId", u.name AS reporter_name,
    r."targetType", r."targetId",
    c.name AS target_club_name,
    r.reason, r.details, r."createdAt",
    (SELECT COUNT(*) FROM "Report" r2
     WHERE r2."targetType" = r."targetType"
       AND r2."targetId" = r."targetId"
       AND r2.status = 'pending') AS report_count
  FROM "Report" r
  LEFT JOIN users u ON u.id = r."reporterId"
  LEFT JOIN clubs c ON c.id = r."targetId"
  WHERE r.status = 'pending'
  ORDER BY report_count DESC, r."createdAt" ASC
  LIMIT 200;
$$;
