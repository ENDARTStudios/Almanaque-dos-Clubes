-- =============================================================================
-- T423 — PostGIS em stadiums (+ T430: guarda para bancos sem PostGIS)
-- Habilita a extensão PostGIS e adiciona a coluna geométrica `location` (Point/4326)
-- na tabela `stadiums`. Prisma expõe essa coluna como Unsupported("geometry(Point,4326)")
-- no schema (ver apps/api/prisma/schema.prisma).
--
-- Como o CI usa `prisma db push` (não `migrate deploy`), a extensão é criada também
-- no passo "Sync schema (test DB)" do .github/workflows/ci.yml, ANTES do db push,
-- para que o tipo `geometry` exista quando a tabela for criada/alterada.
--
-- T430 — guarda DO: o Postgres de produção (plugin Railway) NÃO tem os
-- binários do PostGIS (`pg_available_extensions` sem `postgis`), então um
-- `CREATE EXTENSION` incondicional quebraria o `migrate deploy` no boot
-- (e o entrypoint fail-fast impediria o container de subir). Com a guarda,
-- o deploy aplica a migration como no-op documentado onde não há PostGIS;
-- o Prisma tolera a coluna `Unsupported` ausente (queries que não a tocam
-- funcionam). Onde há PostGIS (CI, dev), a coluna é criada normalmente.
-- Justificativa da edição (exceção à imutabilidade): este arquivo NUNCA foi
-- aplicado via `migrate deploy` em nenhum ambiente (CI usa `db push`;
-- produção recebia SQL manual) — verificado em `_prisma_migrations` de
-- produção em 2026-09-08. Primeira aplicação real será via T430.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
    CREATE EXTENSION IF NOT EXISTS postgis;
    ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS location geometry(Point,4326);
    CREATE INDEX IF NOT EXISTS stadiums_location_gix ON stadiums USING GIST (location);
  ELSE
    RAISE NOTICE 'T430: postgis indisponível — stadiums.location não criada (no-op seguro)';
  END IF;
END $$;
