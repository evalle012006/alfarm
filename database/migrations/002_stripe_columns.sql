-- Migration 002: Add Stripe payment support columns
-- Run this after the initial schema.sql has been applied.

-- 1. Add paid_amount column (was missing — PaymentCard showed ₱0 always)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0;

-- 2. Add Stripe reference columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- 3. Expand payment_method CHECK constraint to include 'stripe'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('cash', 'gcash', 'paymaya', 'stripe'));

-- 4. Create payment_transactions ledger table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('charge', 'refund', 'void')),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_refund_id VARCHAR(255),
  notes TEXT,
  created_by INT REFERENCES users(id), -- NULL for webhook-created entries
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_booking ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_stripe_pi ON payment_transactions(stripe_payment_intent_id);

-- 5. Index on stripe columns for webhook lookups
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi ON bookings(stripe_payment_intent_id);
