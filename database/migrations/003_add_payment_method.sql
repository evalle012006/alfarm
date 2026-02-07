-- Migration: Add payment_method column to bookings table
-- Tracks the payment method selected by the guest at checkout

-- Add payment_method column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE bookings
        ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash';
    END IF;
END $$;

-- Add CHECK constraint safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_method_check'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_payment_method_check
        CHECK (payment_method IN ('cash', 'gcash', 'paymaya'));
    END IF;
END $$;

-- Default existing bookings to 'cash'
UPDATE bookings SET payment_method = 'cash' WHERE payment_method IS NULL;
