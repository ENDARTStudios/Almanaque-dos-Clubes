-- T507 (Operador, 10/10) — texto editorial por idioma (Wikipedia REST, CC-BY-SA).
-- Migration 100% ADITIVA.
ALTER TABLE "clubs" ADD COLUMN "editorialText" JSONB;
