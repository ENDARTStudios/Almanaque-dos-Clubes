-- =============================================================================
-- Almanaque dos Clubes — Índices Full-Text Search (PostgreSQL)
-- =============================================================================
-- Prisma 5.22 NÃO suporta declarativamente:
--   1. Índices GIN em colunas tsvector
--   2. Índices trigram (pg_trgm)
--   3. Colunas computadas tsvector geradas a partir de outras
--
-- Solução adotada (Tarefa 2.11):
--   - Colunas `search_vector Unsupported("tsvector")?` no schema.prisma
--     (permitem que o Prisma Client saiba que existem, mas não permite queries)
--   - Este arquivo SQL cria os índices e os triggers que populam search_vector
--   - Aplicado após a migration Prisma, via migrate.ps1 (Tarefa 2.13)
--
-- Como aplicar manualmente:
--   psql "$DATABASE_URL" -f prisma/fulltext-indexes.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CLUBES — busca por nome, fullName, shortName
-- -----------------------------------------------------------------------------

-- 1.1. Índice GIN na coluna search_vector (tsvector)
CREATE INDEX IF NOT EXISTS clubs_search_vector_idx
  ON clubs
  USING gin (search_vector);

-- 1.2. Trigger para manter search_vector atualizada
-- Combina: name || ' ' || COALESCE(fullName, '') || ' ' || COALESCE(shortName, '')
-- Usa to_tsvector('portuguese', ...) para stemmer correto (ex.: "jogando" → "jogar")
CREATE OR REPLACE FUNCTION clubs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.full_name, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.short_name, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clubs_search_vector_trigger ON clubs;
CREATE TRIGGER clubs_search_vector_trigger
  BEFORE INSERT OR UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION clubs_search_vector_update();

-- 1.3. Índices trigram (pg_trgm) para busca fuzzy por similaridade
CREATE INDEX IF NOT EXISTS clubs_name_trgm_idx
  ON clubs
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS clubs_full_name_trgm_idx
  ON clubs
  USING gin (full_name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 2. JOGADORES — busca por fullName, shortName
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS players_search_vector_idx
  ON players
  USING gin (search_vector);

CREATE OR REPLACE FUNCTION players_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.short_name, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS players_search_vector_trigger ON players;
CREATE TRIGGER players_search_vector_trigger
  BEFORE INSERT OR UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION players_search_vector_update();

CREATE INDEX IF NOT EXISTS players_full_name_trgm_idx
  ON players
  USING gin (full_name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 3. COMPETIÇÕES — busca por name
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS competitions_search_vector_idx
  ON competitions
  USING gin (search_vector);

CREATE OR REPLACE FUNCTION competitions_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS competitions_search_vector_trigger ON competitions;
CREATE TRIGGER competitions_search_vector_trigger
  BEFORE INSERT OR UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION competitions_search_vector_update();

CREATE INDEX IF NOT EXISTS competitions_name_trgm_idx
  ON competitions
  USING gin (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 4. Helper para popular search_vector retroativamente
-- -----------------------------------------------------------------------------
-- Após primeira aplicação deste arquivo, chamar para popular as colunas
-- já existentes (triggers só disparam em INSERT/UPDATE futuros).
-- Pode ser chamado múltiplas vezes (idempotente via UPDATE com mesma expressão).

UPDATE clubs SET name = name WHERE true;       -- força trigger de UPDATE
UPDATE players SET full_name = full_name WHERE true;
UPDATE competitions SET name = name WHERE true;
