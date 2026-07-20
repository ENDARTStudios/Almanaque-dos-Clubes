-- =============================================================================
-- Almanaque dos Clubes — Extensões PostgreSQL
-- =============================================================================
-- Aplicar ANTES de qualquer migration que use UUID, pgcrypto, ou pg_trgm.
--
-- Prisma 5.22 não suporta CREATE EXTENSION declarativamente no schema.prisma.
-- Este arquivo deve ser aplicado manualmente (ou via migrate.ps1) antes da
-- primeira migration Prisma.
--
-- Como aplicar manualmente:
--   psql "$DATABASE_URL" -f prisma/extensions.sql
--
-- Como aplicar via migrate.ps1 (Tarefa 2.13):
--   Incluído automaticamente no script PowerShell.
-- =============================================================================

-- uuid-ossp: funções para gerar UUIDs (uuid_generate_v4()).
-- Já usamos @default(uuid()) no schema, mas a extensão garante disponibilidade
-- para queries manuais e futuras colunas que precisem de UUID externo.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto: funções criptográficas (digest, gen_random_bytes, etc.).
-- Já usamos argon2 via Node.js (apps/api/src/config/crypto.ts), mas pgcrypto
-- é necessária para:
-- - hash de colunas sensíveis se migrarmos para crypto no banco (futuro)
-- - gen_random_uuid() como alternativa a uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm: índices trigram para busca por similaridade textual.
-- Usado em Club.name, Player.fullName, Competition.name para:
-- - Busca fuzzy: "Flamengu" encontra "Flamengo"
-- - Correção de typos
-- Ver prisma/fulltext-indexes.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
