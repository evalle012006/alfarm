-- Migration: Add overnight date-range support to bookings table
-- Run this on existing databases to add the new columns

-- Add check_out_date column for overnight stays
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_out_date DATE;

-- Add booking_type column to distinguish day-use vs overnight
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'day';

-- Add constraint for booking_type (if not exists, we do it safely)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_booking_type_check'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_booking_type_check 
        CHECK (booking_type IN ('day', 'overnight'));
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_checkout ON bookings(check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);

-- Update existing bookings: set booking_type based on product pricing_unit
-- Bookings with 'per_night' products should be 'overnight'
UPDATE bookings b
SET booking_type = 'overnight'
WHERE EXISTS (
    SELECT 1 FROM booking_items bi
    JOIN products p ON bi.product_id = p.id
    WHERE bi.booking_id = b.id AND p.pricing_unit = 'per_night'
)
AND b.booking_type IS NULL OR b.booking_type = 'day';
