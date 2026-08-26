-- Complementa as policies RLS de sessions (T377).
-- Aditiva; NÃO edita a migration 20260824_rls_sessions já aplicada.
-- (PostgreSQL não suporta "CREATE POLICY IF NOT EXISTS"; a migration é
--  aplicada uma única vez via _prisma_migrations, o que garante idempotência
--  operacional.)

-- SELECT pré-auth por POSSE do hash do refresh token (verify/refresh sem
-- userId conhecido). O GUC recebe apenas o hash SHA-256, nunca o token cru;
-- ausente/vazio → NULLIF → NULL → deny.
CREATE POLICY "sessions_select_by_token" ON "sessions"
  FOR SELECT
  USING ("tokenHash" = NULLIF(current_setting('app.current_token_hash', true), ''));

-- INSERT: dono cria a própria sessão (ou role SERVICE).
CREATE POLICY "sessions_insert_owner" ON "sessions"
  FOR INSERT
  WITH CHECK (
    "userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE'
  );

-- UPDATE: dono (linhas do próprio usuário).
CREATE POLICY "sessions_update_owner" ON "sessions"
  FOR UPDATE
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- UPDATE: SERVICE (manutenção).
CREATE POLICY "sessions_update_service" ON "sessions"
  FOR UPDATE
  USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

-- DELETE: apenas SERVICE (cleanup de sessões expiradas).
CREATE POLICY "sessions_delete_service" ON "sessions"
  FOR DELETE
  USING (current_setting('app.current_user_role', true) = 'SERVICE');
