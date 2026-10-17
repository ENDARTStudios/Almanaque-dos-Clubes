-- T581 — nome de EXIBIÇÃO da linha NL na tabela `countries`.
--
-- MEDIDO (auditoria visual, 2026-10-16): a linha do `iso2='NL'` gravava o nome do REINO
-- ("Kingdom of the Netherlands"), escolhido porque o QID Q29999 tem `P297` válido enquanto o
-- Q55 (Países Baixos) tem `P297` deprecado. O `name` da tabela é a referência em INGLÊS do
-- acervo (D-2026-10-16-t580) e é usado na busca do índice de países; o rótulo visível já vem
-- do ICU (`Intl.DisplayNames`, que mostra "Países Baixos"/"Netherlands"/"Países Bajos").
--
-- Decisão do dono: o dado deve dizer "Netherlands", como os demais países. O QID NÃO muda
-- (continua Q29999): só o nome de referência é corrigido.
--
-- Idempotente: re-executar não altera nada (o WHERE deixa de casar). Reversão:
--   UPDATE "countries" SET "name" = 'Kingdom of the Netherlands', "updatedAt" = CURRENT_TIMESTAMP
--   WHERE "iso2" = 'NL' AND "name" = 'Netherlands';
UPDATE "countries"
SET "name" = 'Netherlands', "updatedAt" = CURRENT_TIMESTAMP
WHERE "iso2" = 'NL' AND "name" = 'Kingdom of the Netherlands';
