-- T425 — Metadata de base auditável do Ranking 0-100.
-- Aditivo (não destrutivo). Aplica sobre o schema atual de `ranking_entries`.
--
--  * `position` passou a ser NULLABLE: um registro com `position = NULL` e
--    `reason = 'dados insuficientes'` representa um clube-ano que não publica
--    posição/score (amostra mínima não atendida) — T425 pontos 1 e 8.
--  * `baseMatches` / `baseTitles` — base auditável que a UI exibirá
--    ("com base em N partidas / T títulos auditáveis").
--  * `dataSourceIds` — proveniência (JSONB, ex.: ["rsssf","wikidata"]).
--  * `reason` — motivo de não-publicação (NULL ou "dados insuficientes").
--  * `gender` — "men" | "women" — isolamento por gênero (normalização separada).

ALTER TABLE "ranking_entries" ALTER COLUMN "position" DROP NOT NULL;

ALTER TABLE "ranking_entries" ADD COLUMN "baseMatches"   INTEGER;
ALTER TABLE "ranking_entries" ADD COLUMN "baseTitles"    INTEGER;
ALTER TABLE "ranking_entries" ADD COLUMN "dataSourceIds" JSONB;
ALTER TABLE "ranking_entries" ADD COLUMN "reason"        TEXT;
ALTER TABLE "ranking_entries" ADD COLUMN "gender"        TEXT;

CREATE INDEX IF NOT EXISTS "ranking_entries_gender_idx" ON "ranking_entries"("gender");
