-- T034 (mapeamento do portal, 09/10) — gênero do jogador (P21 Wikidata) para a
-- ingestão de jogadores em escala e os perfis públicos. Coluna ADITIVA nullable:
-- nenhuma linha é reescrita; proveniência segue em importedFrom/sourceUrl.
-- TEXT (padrão Prisma para String), mesmo padrão da T450 (gender em clubs/competitions).
ALTER TABLE "players" ADD COLUMN "gender" TEXT;
