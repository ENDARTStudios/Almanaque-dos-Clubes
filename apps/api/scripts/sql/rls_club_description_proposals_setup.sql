-- WS-C-10 — RLS (ENABLE + FORCE) em "ClubDescriptionProposal". Idempotente.
-- Regras:
--  - SELECT: aprovadas/rejeitadas são públicas (para autenticados); pending só
--    o próprio proponente vê (anti-cópia) — editores usam a função SECURITY
--    DEFINER club_proposals_list (serviço verifica ownership antes de chamar);
--  - INSERT: só o próprio proponente (ou SERVICE);
--  - UPDATE: SOMENTE SERVICE — a revisão (approve/reject) é feita pela API após
--    verificação de ownership ativa + bloqueio de auto-revisão no código
--    (regra: RLS é defesa em profundidade; escopo de negócio no serviço).
ALTER TABLE "ClubDescriptionProposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubDescriptionProposal" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cdp_select" ON "ClubDescriptionProposal";
CREATE POLICY "cdp_select" ON "ClubDescriptionProposal"
  FOR SELECT USING (
    status <> 'pending'
    OR "proposedBy" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE'
  );

DROP POLICY IF EXISTS "cdp_insert" ON "ClubDescriptionProposal";
CREATE POLICY "cdp_insert" ON "ClubDescriptionProposal"
  FOR INSERT WITH CHECK ("proposedBy" = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'SERVICE');

DROP POLICY IF EXISTS "cdp_update_service" ON "ClubDescriptionProposal";
CREATE POLICY "cdp_update_service" ON "ClubDescriptionProposal"
  FOR UPDATE USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

-- Lista de propostas do clube com nomes (proposer/reviewer): SECURITY DEFINER
-- (padrão T442 — app_user não tem GRANT em users). p_status NULL = todas.
CREATE OR REPLACE FUNCTION club_proposals_list(p_club_id text, p_status text DEFAULT NULL)
RETURNS TABLE (
  id text,
  "proposedBy" text,
  proposer_name text,
  "userDescription" text,
  status text,
  "createdAt" timestamp(3),
  "reviewedAt" timestamp(3),
  "reviewedBy" text,
  reviewer_name text,
  "reviewNote" text
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    p.id, p."proposedBy", u.name AS proposer_name,
    p."userDescription", p.status, p."createdAt",
    p."reviewedAt", p."reviewedBy", ru.name AS reviewer_name,
    p."reviewNote"
  FROM "ClubDescriptionProposal" p
  LEFT JOIN users u ON u.id = p."proposedBy"
  LEFT JOIN users ru ON ru.id = p."reviewedBy"
  WHERE p."clubId" = p_club_id
    AND (p_status IS NULL OR p.status = p_status)
  ORDER BY p."createdAt" DESC
  LIMIT 100;
$$;
