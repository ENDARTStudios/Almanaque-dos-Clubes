-- T400 — cria a role app_user (nao-superusuario, sem BYPASSRLS) c/ grants minimos.
-- Idempotente: cria a role somente se nao existir; grants sao acumulativos.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON "sessions" TO app_user;
-- USAGE em sequences (tabelas com serial/identity). Sessoes usam uuid PK (sem sequence).
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- NOTA (T401): ampliar grants por tabela conforme os fluxos da API, mantendo o menor privilegio.