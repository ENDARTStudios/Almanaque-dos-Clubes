-- =============================================================================
-- T423 — PostGIS em stadiums
-- Habilita a extensão PostGIS e adiciona a coluna geométrica `location` (Point/4326)
-- na tabela `stadiums`. Prisma expõe essa coluna como Unsupported("geometry(Point,4326)")
-- no schema (ver apps/api/prisma/schema.prisma).
--
-- Como o CI usa `prisma db push` (não `migrate deploy`), a extensão é criada também
-- no passo "Sync schema (test DB)" do .github/workflows/ci.yml, ANTES do db push,
-- para que o tipo `geometry` exista quando a tabela for criada/alterada.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS location geometry(Point,4326);

-- Índice espacial para consultas geoespaciais (mapa-múndi, "estádios próximos").
CREATE INDEX IF NOT EXISTS stadiums_location_gix ON stadiums USING GIST (location);
