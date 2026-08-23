-- Enable and force Row Level Security on sessions (T344)
-- Deny-by-default; owner-only read; explicit SERVICE bypass.
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;

CREATE POLICY "sessions_owner_select" ON "sessions"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "sessions_service_select" ON "sessions"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) = 'SERVICE');
