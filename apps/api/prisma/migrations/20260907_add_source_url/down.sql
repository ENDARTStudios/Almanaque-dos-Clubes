-- =============================================================================
-- T426 — DOWN de 20260907_add_source_url (reversão testada em banco de teste)
-- Remove as colunas `sourceUrl` adicionadas pela migration. Uso:
--   psql "$DATABASE_URL_TESTE" -f down.sql
-- NUNCA em produção sem autorização do Operador (dado histórico se preserva).
-- =============================================================================

-- Como o mesmo arquivo deve rodar em PostgreSQL e SQLite (banco de teste),
-- usa DROP COLUMN simples (sem IF EXISTS — inexistente no SQLite).

ALTER TABLE stadiums DROP COLUMN "sourceUrl";
ALTER TABLE competitions DROP COLUMN "sourceUrl";
ALTER TABLE players DROP COLUMN "sourceUrl";
ALTER TABLE clubs DROP COLUMN "sourceUrl";
