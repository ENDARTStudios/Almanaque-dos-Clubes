-- T32 — EVOLUÇÃO DOS ESCUDOS: tabela nova, nada existente é alterado.
--
-- ADITIVA por construção: só CREATE TABLE + índices. Nenhuma coluna de "Club" é
-- tocada (a ligação é a relação `crests`, que não exige alteração na tabela pai), e
-- nenhuma linha existente é migrada ou reescrita.
--
-- PRODUÇÃO em 18-10-2026: 752 clubes têm `logoUrl` (todos do Wikimedia Commons), mas
-- NENHUM tem histórico. Portanto a tabela nasce vazia — não há grandfathering a fazer
-- nem escudo a converter em linha. O `logoUrl` existente continua sendo o retrato atual
-- e NÃO é copiado para cá: copiar criaria uma linha com `license` desconhecida, e a
-- licença é obrigatória justamente para isso não acontecer.

CREATE TABLE "club_crests" (
    "id"           TEXT NOT NULL,
    "clubId"       TEXT NOT NULL,
    "imageUrl"     TEXT NOT NULL,
    "sourceUrl"    TEXT NOT NULL,
    "license"      TEXT NOT NULL,
    "attribution"  TEXT,
    "yearFrom"     INTEGER,
    "yearTo"       INTEGER,
    "isCurrent"    BOOLEAN NOT NULL DEFAULT false,
    "periodLabel"  TEXT,
    "importedFrom" TEXT,
    "importedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_crests_pkey" PRIMARY KEY ("id")
);

-- O mesmo arquivo não entra duas vezes para o mesmo clube (idempotência do bot).
CREATE UNIQUE INDEX "club_crests_clubId_imageUrl_key" ON "club_crests"("clubId", "imageUrl");

-- Ordenação da linha do tempo no perfil do clube.
CREATE INDEX "club_crests_clubId_yearFrom_idx" ON "club_crests"("clubId", "yearFrom");

-- Apagar o clube leva os escudos junto (onDelete: Cascade no schema).
ALTER TABLE "club_crests"
    ADD CONSTRAINT "club_crests_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
