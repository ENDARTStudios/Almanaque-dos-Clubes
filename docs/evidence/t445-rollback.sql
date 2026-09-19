-- T445 — rollback da migration 20260918120000_direitos_titular
DROP TABLE IF EXISTS "copyright_claims";
DROP TABLE IF EXISTS "privacy_requests";
-- Remover também de apps/api/scripts/sql/create_app_user.sql os
-- 2 GRANTs correspondentes (regra grants: mesmo PR da migration).
