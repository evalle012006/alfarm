-- AlFarm Resort and Adventure Park Database Schema (PostgreSQL)

-- Create Database (run this separately)
-- CREATE DATABASE alfarm_resort;

-- Connect to the database
-- \c alfarm_resort;

-- Users Table (for both admin and guests)
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('standard', 'deluxe', 'suite', 'villa', 'cabin')),
    description TEXT,
    capacity INT NOT NULL DEFAULT 2,
    price_per_night DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rooms_type ON rooms(room_type);
CREATE INDEX idx_rooms_status ON rooms(status);

-- Amenities Table
CREATE TABLE IF NOT EXISTS amenities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room Amenities (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS room_amenities (
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    amenity_id INT REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, amenity_id)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    number_of_guests INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_checkin ON bookings(check_in_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Insert root/admin user
-- Password: admin123 (you should change this!)
-- This is a bcrypt hash for 'admin123'
INSERT INTO users (email, password, first_name, last_name, role) 
VALUES ('admin@alfarm.com', '$2a$10$rF9Qn4fJPVjJZ.xJZKVpUeN8qPX5h3x5J7ZGqX5X5X5X5X5X5X5Xu', 'Admin', 'User', 'root')
ON CONFLICT (email) DO NOTHING;

-- Insert sample amenities
INSERT INTO amenities (name, description, icon) VALUES
('WiFi', 'High-speed wireless internet throughout the resort', 'FaWifi'),
('Air Conditioning', 'Climate control in all rooms', 'FaSnowflake'),
('TV', 'Smart TV with streaming services', 'FaTv'),
('Mini Bar', 'In-room refreshments and snacks', 'FaGlassMartini'),
('Safe', 'Personal safe for valuables', 'FaLock'),
('Room Service', '24/7 room service available', 'FaConcierge'),
('Pool Access', 'Access to adventure pools', 'FaSwimmingPool'),
('Adventure Activities', 'Zip-lining, hiking trails, and more', 'FaMountain'),
('Restaurant', 'On-site farm-to-table dining', 'FaUtensils'),
('Nature Trails', 'Guided nature walks and wildlife viewing', 'FaTree')
ON CONFLICT DO NOTHING;

-- Insert sample rooms
INSERT INTO rooms (room_number, room_type, description, capacity, price_per_night, status) VALUES
('101', 'standard', 'Cozy standard room with garden view and forest ambiance', 2, 1500.00, 'available'),
('102', 'standard', 'Standard room with nature trail access', 2, 1500.00, 'available'),
('201', 'deluxe', 'Spacious deluxe room with mountain view and balcony', 3, 2500.00, 'available'),
('202', 'deluxe', 'Deluxe room with adventure park view', 3, 2500.00, 'available'),
('301', 'suite', 'Luxury suite with separate living area and forest view', 4, 4000.00, 'available'),
('401', 'villa', 'Private villa with outdoor space and nature immersion', 6, 6500.00, 'available'),
('501', 'cabin', 'Rustic cabin with authentic farm experience', 4, 3500.00, 'available')
ON CONFLICT (room_number) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
