-- T400/T401 — role app_user (nao-superusuario, NOBYPASSRLS) com grants DML nas tabelas da API.
-- Idempotente: cria a role somente se nao existir.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "audit_logs" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "billings" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "cities" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "clubs" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "cookie_consents" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "cookie_policy_versions" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "competitions" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "copyright_claims" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "countries" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "favorites" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "knowledge_graph" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "matches" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "permissions" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "players" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "privacy_requests" TO app_user;
GRANT SELECT, INSERT ON TABLE "payment_events" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ranking_entries" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "rankings" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "role_permissions" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "roles" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "seasons" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "sessions" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "stadiums" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "states" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "subscriptions" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user_roles" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "users" TO app_user;

-- USAGE em sequences (DB usa uuid PKs; guarda para tabelas com serial/identity).
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- NOTA: RLS (FORCE) ativo apenas em sessions; demais tabelas sem RLS (mesmo acesso do app atual
-- postgres, porem sob role nao-superusuario). users/audit_logs dependem de RLS futura ou controle de app.
