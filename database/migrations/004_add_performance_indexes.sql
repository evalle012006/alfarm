-- Migration 004: Add performance indexes for common query patterns
-- Run this migration against your PostgreSQL database

-- Guest management: search by name/email
CREATE INDEX IF NOT EXISTS idx_users_name ON users (first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Bookings: filter by date and status
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings (booking_date, status);

-- Audit logs: filter by entity
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);

-- Bookings by user (for guest dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id, booking_date DESC);
