-- T449EN — Soft-delete de clube (ruído): `clubs.deletedAt`.
-- Exclui das views por padrão (repository filtra `deletedAt: null`). Sem hard delete.
-- Reversível: ALTER TABLE "clubs" DROP COLUMN "deletedAt";
-- Sem GRANT novo (app_user já tem DML em clubs); clubs não tem RLS.
ALTER TABLE "clubs" ADD COLUMN     "deletedAt" TIMESTAMP(3);
