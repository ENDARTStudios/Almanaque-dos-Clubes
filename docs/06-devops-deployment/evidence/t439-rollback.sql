-- T439 — rollback da migration 20260915120000_favorites (forward-only consciente;
-- revert de código NÃO reverte dados de usuário — ver DECISOES).
DROP TABLE IF EXISTS "favorites";
