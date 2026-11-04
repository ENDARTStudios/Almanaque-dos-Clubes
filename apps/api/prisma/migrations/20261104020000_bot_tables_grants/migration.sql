-- #808 — as tabelas `bot_states`/`bot_runs` nasceram sem GRANT para `app_user`
-- (a API conecta como app_user em produção). Sintoma em 11-04:
--   permission denied for table bot_states (42501) ao rodar qualquer bot.
-- O padrão do projeto concede por tabela (ver scripts/sql/create_app_user.sql);
-- aqui o DO block mantém a migration válida em bancos sem a role (CI drift).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "bot_states" TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "bot_runs" TO app_user;
  END IF;
END $$;
