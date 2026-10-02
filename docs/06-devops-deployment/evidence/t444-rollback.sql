-- T444 — rollback da migration 20260916120000_payment_events
DROP TABLE IF EXISTS "payment_events";
-- PAST_DUE: enum values não removíveis sem recreate do tipo — sem rollback
-- necessário (valor aditivo não utilizado é inofensivo).
