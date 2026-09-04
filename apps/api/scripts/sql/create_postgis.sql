-- T423 — PostGIS: cria a extensão no banco de TESTE antes do `prisma db push`.
-- Executado no CI (service container postgis/postgis) e localmente.
CREATE EXTENSION IF NOT EXISTS postgis;
