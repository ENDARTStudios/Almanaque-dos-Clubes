-- T-24/25 — enriquecimento de COMPETIÇÕES via Wikidata (bot enrich-competitions).
--
-- Fonte: Wikidata (CC0) — descriptions (pt/en/es), P571 (inceptionYear), P576
-- (dissolvedAt). Migration 100% ADITIVA: nenhuma linha é reescrita, nenhuma
-- coluna é removida.
--
-- `description` carrega proveniência embutida ({pt,en,es,sourceUrl,at}).
-- `competitionEnrichment` é o cursor de TENTATIVA por competição (padrão
-- `profileEnrichment` do T-22.3): `{at,status,processed,updated,skipped,errors}`
-- — registro ausente = nunca tentado, critério de seleção da fila.
--
-- `states.flagUrl` (passada 2, `--states`): bandeira do estado via P163,
-- URL resolvida pelo MESMO pipeline do trophyImageUrl (T509 → commonsFilePath).
--
-- Idempotente: re-executar não altera nada (colunas nascem NULL).

ALTER TABLE "competitions" ADD COLUMN "description" JSONB;
ALTER TABLE "competitions" ADD COLUMN "inceptionYear" INTEGER;
ALTER TABLE "competitions" ADD COLUMN "dissolvedAt" TIMESTAMP(3);
ALTER TABLE "competitions" ADD COLUMN "competitionEnrichment" JSONB;
ALTER TABLE "states" ADD COLUMN "flagUrl" TEXT;
