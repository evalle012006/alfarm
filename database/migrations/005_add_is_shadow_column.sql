-- Migration 005: Add is_shadow column for better shadow account detection
-- Run this migration against your PostgreSQL database

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_shadow BOOLEAN DEFAULT FALSE;

-- Mark existing shadow accounts based on the placeholder hash pattern
UPDATE users SET is_shadow = TRUE
WHERE password = '$2a$10$placeholderHashForGuestCheckout................';

-- Future shadow accounts created during guest checkout should set is_shadow = TRUE
-- When a user registers/claims their account, set is_shadow = FALSE
