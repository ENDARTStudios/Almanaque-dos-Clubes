-- T519 — proveniência fina das partidas vindas da RSSSF.
--
-- `scorers`: autores dos gols quando a fonte imprime a linha de artilharia
--   (`  [Endrick 4, Flaco López 64; Raniele 45+5]` — `;` separa casa/fora).
--   Guarda { raw, home: [{player, minute}], away: [...], sidesVerified }.
-- `sourceNote`: anotação da própria fonte sobre o jogo, preservada sem
--   interpretação — ex.: `[played in Uberlândia-MG]` (estádio alternativo),
--   `[replay]`, e os marcadores de nota `x`/`y` da Libertadores (que a página
--   não explica; ficam registrados como estão em vez de adivinhados).
--
-- ADITIVAS e nullable: nenhuma linha existente muda (a tabela `matches` está vazia).
ALTER TABLE "matches" ADD COLUMN "scorers" JSONB;
ALTER TABLE "matches" ADD COLUMN "sourceNote" TEXT;
