-- Rollback of @aims/melanium 001_init

BEGIN;

DROP TRIGGER IF EXISTS trg_customer_balances_updated_at ON customer_balances;
DROP FUNCTION IF EXISTS melanium_set_updated_at();

DROP TABLE IF EXISTS customer_balance_events;
DROP TABLE IF EXISTS customer_balances;
DROP TABLE IF EXISTS melanium_transactions;

DROP TYPE IF EXISTS melanium_event_type;

COMMIT;
