-- T596 — TIME DO CORAÇÃO: o clube de que o usuário é torcedor fanático.
--
-- Coluna nova em "users", ADITIVA: nenhuma linha existente é reescrita (todas
-- nascem NULL = "ainda não escolheu"; nunca presumimos um clube pelo histórico
-- de favoritos — a declaração é do usuário, e só dele).
--
-- 1:1 POR CONSTRUÇÃO: a FK mora em "users", então um usuário tem no máximo um
-- Time do Coração — diferente de `favorites`, que é a lista plural de clubes
-- seguidos, sem hierarquia entre eles.
--
-- ON DELETE SET NULL: apagar o clube do acervo não apaga o usuário; ele apenas
-- volta a "não escolheu".
--
-- GRANTs: nenhum novo — app_user já tem DML em "users" (create_app_user.sql),
-- e a escrita da própria linha roda sob contexto RLS owner (padrão T442/WS-C-14).

ALTER TABLE "users" ADD COLUMN "heartClubId" TEXT;

CREATE INDEX "users_heartClubId_idx" ON "users"("heartClubId");

ALTER TABLE "users"
    ADD CONSTRAINT "users_heartClubId_fkey"
    FOREIGN KEY ("heartClubId") REFERENCES "clubs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
