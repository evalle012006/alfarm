-- Migration 003: Rename Stripe columns to PayMongo
-- Run this after migration 002 has been applied.

-- 1. Rename Stripe reference columns to PayMongo
ALTER TABLE bookings RENAME COLUMN stripe_checkout_session_id TO paymongo_checkout_session_id;
ALTER TABLE bookings RENAME COLUMN stripe_payment_intent_id TO paymongo_payment_id;

-- 2. Migrate all existing payment methods to 'paymongo'
UPDATE bookings SET payment_method = 'paymongo' WHERE payment_method != 'paymongo';
UPDATE payment_transactions SET payment_method = 'paymongo' WHERE payment_method != 'paymongo';

-- 3. Update payment_method CHECK constraint (only 'paymongo' allowed)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('paymongo'));
ALTER TABLE bookings ALTER COLUMN payment_method SET DEFAULT 'paymongo';

-- 4. Rename columns in payment_transactions table
ALTER TABLE payment_transactions RENAME COLUMN stripe_payment_intent_id TO paymongo_payment_id;
ALTER TABLE payment_transactions RENAME COLUMN stripe_refund_id TO paymongo_refund_id;

-- 5. Drop old indexes and create new ones
DROP INDEX IF EXISTS idx_bookings_stripe_session;
DROP INDEX IF EXISTS idx_bookings_stripe_pi;
DROP INDEX IF EXISTS idx_payment_tx_stripe_pi;

CREATE INDEX IF NOT EXISTS idx_bookings_paymongo_session ON bookings(paymongo_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_paymongo_payment ON bookings(paymongo_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_paymongo_payment ON payment_transactions(paymongo_payment_id);
