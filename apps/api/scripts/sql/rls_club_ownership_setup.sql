-- WS-C-9 Modo Clube — RLS (ENABLE + FORCE) em "ClubOwnership".
-- Leitura: qualquer app_user autenticado vê ownerships (lista de editores é
-- pública na UI). Escrita: SOMENTE o próprio dono (userId = contexto) ou SERVICE.
-- Edição de clubs.userDescription é guardada na camada de serviço (ownership
-- active verificado no código) — o GRANT de colunas cobre o resto.
-- Mesmo padrão de rls_favorites_setup.sql. Idempotente.

ALTER TABLE "ClubOwnership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubOwnership" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_ownership_select_authenticated" ON "ClubOwnership";
CREATE POLICY "club_ownership_select_authenticated" ON "ClubOwnership"
  FOR SELECT USING (
    current_setting('app.current_user_id', true) IS NOT NULL
    OR current_setting('app.current_user_role', true) = 'SERVICE'
  );

DROP POLICY IF EXISTS "club_ownership_insert_owner" ON "ClubOwnership";
CREATE POLICY "club_ownership_insert_owner" ON "ClubOwnership"
  FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "club_ownership_update_owner" ON "ClubOwnership";
CREATE POLICY "club_ownership_update_owner" ON "ClubOwnership"
  FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "club_ownership_delete_owner" ON "ClubOwnership";
CREATE POLICY "club_ownership_delete_owner" ON "ClubOwnership"
  FOR DELETE USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "club_ownership_service_all" ON "ClubOwnership";
CREATE POLICY "club_ownership_service_all" ON "ClubOwnership"
  FOR ALL USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

-- Lista pública de editores: SECURITY DEFINER (padrão T442) — app_user não tem
-- GRANT na tabela users, então o join nome↔ownership passa pela função.
CREATE OR REPLACE FUNCTION club_owners_list(p_club_id text)
RETURNS TABLE("name" text, "role" text, "since" timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT u.name, co.role, COALESCE(co."approvedAt", co."requestedAt") AS "since"
  FROM "ClubOwnership" co
  JOIN users u ON u.id = co."userId"
  WHERE co."clubId" = p_club_id AND co.status = 'active'
  ORDER BY COALESCE(co."approvedAt", co."requestedAt") ASC
  LIMIT 50;
$$;
-- GRANT EXECUTE da função fica no create_app_user.sql (a role precisa existir antes
-- — no CI este arquivo roda ANTES do create_app_user).
