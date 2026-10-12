-- T522 — Ranking de JOGADORES sobre o mesmo pipeline do ranking de clubes.
--
-- `rankings.type`: 'club' (padrão, preserva todos os rankings já publicados) ou
-- 'player'. Aditivo com default — nenhuma linha existente muda.
ALTER TABLE "rankings" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'club';
CREATE INDEX "rankings_type_idx" ON "rankings"("type");

-- `ranking_entries.clubId` passa a aceitar NULL e a entrada ganha `playerId`:
-- uma entrada de ranking de jogador aponta para o jogador, não para um clube.
-- A unicidade (rankingId, clubId) segue valendo para clubes (Postgres trata NULLs
-- como distintos) e (rankingId, position) continua garantindo posição única.
ALTER TABLE "ranking_entries" ALTER COLUMN "clubId" DROP NOT NULL;
ALTER TABLE "ranking_entries" ADD COLUMN "playerId" TEXT;
CREATE INDEX "ranking_entries_playerId_idx" ON "ranking_entries"("playerId");
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
