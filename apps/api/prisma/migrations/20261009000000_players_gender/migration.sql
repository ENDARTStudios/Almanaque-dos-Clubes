-- T034 (mapeamento do portal, 09/10) — gênero do jogador (P21 Wikidata) para a
-- ingestão de jogadores em escala e os perfis públicos. Coluna ADITIVA nullable:
-- nenhuma linha é reescrita; proveniência segue em importedFrom/sourceUrl.
ALTER TABLE "players" ADD COLUMN "gender" VARCHAR(10);
