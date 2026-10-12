-- T524 — hino do clube (áudio livre + metadados factuais; letra só com licença livre).
-- ADITIVA e nullable: nenhuma linha existente muda.
ALTER TABLE "clubs" ADD COLUMN "anthem" JSONB;
