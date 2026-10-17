-- T-22.3 (tarefa 23) — perfil enriquecido do JOGADOR via Wikidata (bot enrich-player-profiles).
--
-- Fonte: Wikidata (CC0) — P1449 (apelido), P569 (nascimento), P2048 (altura),
-- P413 (posição), P423 (pé preferido), P54 (passagens por clube) e P166 (prêmios
-- individuais). Migration 100% ADITIVA: nenhuma linha é reescrita, nenhuma coluna
-- é removida.
--
-- `individualAwards` carrega proveniência POR ITEM (`[{qid,label,year,sourceUrl}]`).
-- `profileEnrichment` é o cursor de TENTATIVA por jogador (padrão `mediaEnrichment`
-- do T550): `{at,status,processed,updated,skipped,errors}` — registro ausente =
-- nunca tentado, que é o critério de seleção da fila.
--
-- Idempotente: re-executar não altera nada (colunas nascem NULL).

ALTER TABLE "players" ADD COLUMN "nickname" TEXT;
ALTER TABLE "players" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "players" ADD COLUMN "preferredFoot" TEXT;
ALTER TABLE "players" ADD COLUMN "individualAwards" JSONB;
ALTER TABLE "players" ADD COLUMN "profileEnrichment" JSONB;
