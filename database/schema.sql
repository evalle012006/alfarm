-- AlFarm Resort Database Schema (Extended for Products & Flexible Bookings)

-- Users Table (Preserved)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'guest' CHECK (role IN ('admin', 'guest', 'root')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories for Products/Offers
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'Entrance', 'Accommodation', 'Rental', 'Activity'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table (Unifies Rooms, Cottages, Entrance Fees, Rentals)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INT DEFAULT 0, -- Max people per unit (0 for things like rentals)
    price DECIMAL(10, 2) NOT NULL,
    pricing_unit VARCHAR(20) DEFAULT 'fixed' CHECK (pricing_unit IN ('fixed', 'per_head', 'per_hour', 'per_night')),
    time_slot VARCHAR(20) DEFAULT 'any' CHECK (time_slot IN ('day', 'night', 'any')),
    inventory_count INT DEFAULT 1, -- How many of this item exist? (e.g. 10 tents, 1 function hall)
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Header
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id), -- Can be null for guest checkout
    guest_first_name VARCHAR(100) NOT NULL,
    guest_last_name VARCHAR(100) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME, -- For day tours
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
    total_amount DECIMAL(10, 2) NOT NULL,
    qr_code_hash VARCHAR(255), -- Unique identifier for the QR code
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking Items (The actual products reserved)
CREATE TABLE IF NOT EXISTS booking_items (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL, -- Lock in price at time of booking
    subtotal DECIMAL(10, 2) NOT NULL,
    start_time TIMESTAMP, -- For hourly rentals
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_email ON bookings(guest_email);

-- Seed Data: Categories
INSERT INTO categories (name, description) VALUES
('Entrance Fee', 'Day and Night tour access fees'),
('Accommodation', 'Rooms, Cottages, and Villas'),
('Amenities', 'Activities and Tours'),
('Rentals', 'Equipment and Add-ons')
ON CONFLICT (name) DO NOTHING;

-- Seed Data: Products (Based on offers.md)
-- We need to look up category IDs dynamically or assume order. 
-- Assuming 1=Entrance, 2=Accommodation, 3=Amenities, 4=Rentals

WITH cats AS (SELECT id, name FROM categories)
INSERT INTO products (category_id, name, price, pricing_unit, time_slot, inventory_count, capacity) VALUES
-- Entrance Fees
((SELECT id FROM cats WHERE name='Entrance Fee'), 'Adult Entrance (Day)', 60.00, 'per_head', 'day', 1000, 1),
((SELECT id FROM cats WHERE name='Entrance Fee'), 'Kid Entrance (Day)', 30.00, 'per_head', 'day', 1000, 1),
((SELECT id FROM cats WHERE name='Entrance Fee'), 'Adult Entrance (Night)', 70.00, 'per_head', 'night', 1000, 1),
((SELECT id FROM cats WHERE name='Entrance Fee'), 'Kid Entrance (Night)', 35.00, 'per_head', 'night', 1000, 1),

-- Day Time Accommodations
((SELECT id FROM cats WHERE name='Accommodation'), 'Poolside Table', 300.00, 'fixed', 'day', 10, 4),
((SELECT id FROM cats WHERE name='Accommodation'), 'Screen Cottage (Small)', 400.00, 'fixed', 'day', 5, 15),
((SELECT id FROM cats WHERE name='Accommodation'), 'Screen Cottage (Large)', 700.00, 'fixed', 'day', 5, 20),
((SELECT id FROM cats WHERE name='Accommodation'), 'Open Kubo', 300.00, 'fixed', 'day', 8, 10),
((SELECT id FROM cats WHERE name='Accommodation'), 'Mating Cottage', 700.00, 'fixed', 'day', 3, 6),
((SELECT id FROM cats WHERE name='Accommodation'), 'Function Hall', 3000.00, 'fixed', 'day', 1, 30),

-- Overnight Accommodations
((SELECT id FROM cats WHERE name='Accommodation'), 'Duplex Room (Fan)', 1100.00, 'per_night', 'night', 4, 2),
((SELECT id FROM cats WHERE name='Accommodation'), 'Duplex Room (AC)', 1300.00, 'per_night', 'night', 4, 2),
((SELECT id FROM cats WHERE name='Accommodation'), 'Blue Room (AC)', 1350.00, 'per_night', 'night', 2, 2),
((SELECT id FROM cats WHERE name='Accommodation'), 'Native Style Cottage', 950.00, 'per_night', 'night', 3, 2),
((SELECT id FROM cats WHERE name='Accommodation'), 'Orange Terrace', 4200.00, 'per_night', 'night', 1, 15),
((SELECT id FROM cats WHERE name='Accommodation'), 'Mini Rest House', 3000.00, 'per_night', 'night', 1, 10),
((SELECT id FROM cats WHERE name='Accommodation'), 'Dorm Style Cottage (Small)', 1200.00, 'per_night', 'night', 2, 10),
((SELECT id FROM cats WHERE name='Accommodation'), 'Dorm Style Cottage (Large)', 5000.00, 'per_night', 'night', 1, 25),

-- Rentals
((SELECT id FROM cats WHERE name='Rentals'), 'Shorts', 50.00, 'fixed', 'any', 50, 0),
((SELECT id FROM cats WHERE name='Rentals'), 'Cooking Utensils', 100.00, 'fixed', 'any', 20, 0),
((SELECT id FROM cats WHERE name='Rentals'), 'Extra Bed', 250.00, 'fixed', 'any', 10, 0),
((SELECT id FROM cats WHERE name='Rentals'), 'Basketball/Volleyball', 50.00, 'per_hour', 'any', 5, 0),

-- Amenities
((SELECT id FROM cats WHERE name='Amenities'), 'Horseback Ride', 50.00, 'fixed', 'day', 10, 1),
((SELECT id FROM cats WHERE name='Amenities'), 'Cave Tour', 50.00, 'per_head', 'day', 100, 1);

-- Insert Admin User (Same as before)
INSERT INTO users (email, password, first_name, last_name, role) 
VALUES ('admin@alfarm.com', '$2a$10$rF9Qn4fJPVjJZ.xJZKVpUeN8qPX5h3x5J7ZGqX5X5X5X5X5X5X5Xu', 'Admin', 'User', 'root')
ON CONFLICT (email) DO NOTHING;
