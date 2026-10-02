-- T442 — RLS (ENABLE + FORCE) e policies em users (gap do premortem:
-- "RLS só em sessions → Exposição de PII").
--
-- Modelo de acesso:
--   OWNER (app.current_user_id): SELECT/UPDATE da própria linha.
--   SERVICE (app.current_user_role='SERVICE'): acesso pleno (admin/jobs).
--   INSERT: WITH CHECK id = current_user_id — o FLUXO DE REGISTRO gera o uuid
--     no servidor e seta o contexto antes do INSERT (padrão documentado em
--     DECISOES; evita SECURITY DEFINER para escrita).
--   DELETE: nenhuma policy — desativação é soft (status) via SERVICE.
--   PRE-AUTH (login/forgot/registro-duplicado): busca por email via função
--     SECURITY DEFINER `users_find_by_email` (dono = superuser que aplicou
--     este script → FORCE RLS não se aplica ao superuser). Executável por
--     app_user; nada de SELECT direto pré-auth.
--
-- Idempotente. Ordem no CI/prod: rls_sessions → rls_favorites → rls_users →
-- create_app_user.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_owner_select" ON "users";
CREATE POLICY "users_owner_select" ON "users"
  FOR SELECT USING ("id" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "users_service_select" ON "users";
CREATE POLICY "users_service_select" ON "users"
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "users_insert_register" ON "users";
CREATE POLICY "users_insert_register" ON "users"
  FOR INSERT WITH CHECK ("id" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "users_owner_update" ON "users";
CREATE POLICY "users_owner_update" ON "users"
  FOR UPDATE USING ("id" = current_setting('app.current_user_id', true))
  WITH CHECK ("id" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "users_service_update" ON "users";
CREATE POLICY "users_service_update" ON "users"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "users_service_delete" ON "users";
CREATE POLICY "users_service_delete" ON "users"
  FOR DELETE USING (current_setting('app.current_user_role', true) = 'SERVICE');

-- Função pre-auth: busca por email (login, checagem de duplicidade no
-- registro, forgot-password). SECURITY DEFINER: executa como o dono
-- (superuser) e portanto enxerga apesar do FORCE. STABLE.
CREATE OR REPLACE FUNCTION users_find_by_email(p_email text)
RETURNS SETOF users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM users WHERE email = lower(p_email);
$$;

GRANT EXECUTE ON FUNCTION users_find_by_email(text) TO app_user;
