-- Migration 009: Add missing/phantom products and set image_url for all accommodations
-- 
-- 1. Insert 3 phantom products that existed on the Accommodations page but not in the DB:
--    - Yellow Terrace Standard
--    - Yellow Terrace Deluxe
--    - Rest House
--
-- 2. Set image_url for ALL accommodation products (existing and new) so that
--    the booking selection page can display images on every card.
--
-- 3. Add descriptions to products that were seeded without them.

-- ============================================================
-- Step 1: Insert missing products
-- ============================================================
WITH cats AS (SELECT id, name FROM categories)
INSERT INTO products (category_id, name, description, price, pricing_unit, time_slot, inventory_count, capacity, image_url)
VALUES
  (
    (SELECT id FROM cats WHERE name = 'Accommodation'),
    'Yellow Terrace Standard',
    'Cheerful and bright terrace with comfortable amenities for small families.',
    2800.00, 'per_night', 'night', 1, 4,
    '/images/accommodation/yellow_terrace/yellow_terrace_2.jpeg'
  ),
  (
    (SELECT id FROM cats WHERE name = 'Accommodation'),
    'Yellow Terrace Deluxe',
    'Enhanced terrace experience with more space and premium finishes.',
    3500.00, 'per_night', 'night', 1, 6,
    '/images/accommodation/yellow_terrace_1/yellow_terrace_55.jpeg'
  ),
  (
    (SELECT id FROM cats WHERE name = 'Accommodation'),
    'Rest House',
    'Our largest accommodation for the ultimate family or corporate retreat.',
    8500.00, 'per_night', 'night', 1, 15,
    '/images/accommodation/rest_house/rest_house_12.jpeg'
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Step 2: Set image_url for existing accommodation products
-- ============================================================

-- Day-use accommodations
UPDATE products SET image_url = '/images/accommodation/tables/table_2.jpeg'
WHERE name = 'Poolside Table' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/screen_cottages/screen_cottages_1.jpeg'
WHERE name = 'Screen Cottage (Small)' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/screen_cottages/screen_cottages_1.jpeg'
WHERE name = 'Screen Cottage (Large)' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/tables/table_2.jpeg'
WHERE name = 'Open Kubo' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/screen_cottages/screen_cottages_1.jpeg'
WHERE name = 'Mating Cottage' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/function_hall/function_hall_1.jpeg'
WHERE name = 'Function Hall' AND image_url IS NULL;

-- Overnight accommodations
UPDATE products SET image_url = '/images/accommodation/blue_room/blue_room_6.jpeg'
WHERE name = 'Duplex Room (Fan)' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/blue_room/blue_room_6.jpeg'
WHERE name = 'Duplex Room (AC)' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/blue_room/blue_room_6.jpeg'
WHERE name = 'Blue Room (AC)' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/native_style_room/native_style_room_1.jpeg'
WHERE name = 'Native Style Cottage' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/orange_terrace/orange_terrace_1.jpeg'
WHERE name = 'Orange Terrace' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/mini_resthouse/mini_resthouse_1.jpeg'
WHERE name = 'Mini Rest House' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/dorm_style_cottage/dorm_style_cottage_6.jpeg'
WHERE name = 'Dorm Style Cottage (Small)' AND image_url IS NULL;

UPDATE products SET image_url = '/images/accommodation/dorm_style_cottage/dorm_style_cottage_6.jpeg'
WHERE name = 'Dorm Style Cottage (Large)' AND image_url IS NULL;

-- ============================================================
-- Step 3: Add descriptions to products seeded without them
-- ============================================================
UPDATE products SET description = 'Convenient tables located right by the pool for easy access while swimming.'
WHERE name = 'Poolside Table' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Compact screened cottage for day-use, perfect for small groups.'
WHERE name = 'Screen Cottage (Small)' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Spacious screened cottage for day-use relaxation with your group.'
WHERE name = 'Screen Cottage (Large)' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Traditional open-air kubo for casual day gatherings and picnics.'
WHERE name = 'Open Kubo' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Cozy covered cottage ideal for intimate day-use gatherings.'
WHERE name = 'Mating Cottage' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Ideal venue for weddings, birthdays, and corporate events.'
WHERE name = 'Function Hall' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Comfortable duplex room with natural ventilation and electric fan.'
WHERE name = 'Duplex Room (Fan)' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Modern duplex room with full air conditioning for a cool and restful stay.'
WHERE name = 'Duplex Room (AC)' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Modern and cool standard room with full air conditioning for a perfect rest.'
WHERE name = 'Blue Room (AC)' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Experience authentic resort living in our eco-friendly native cottage.'
WHERE name = 'Native Style Cottage' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Luxurious terrace room with stunning views and premium space for gatherings.'
WHERE name = 'Orange Terrace' AND (description IS NULL OR description = '');

UPDATE products SET description = 'A complete home experience in a compact, private rest house setting.'
WHERE name = 'Mini Rest House' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Perfect for groups. Traditional style cottage with spacious layout.'
WHERE name = 'Dorm Style Cottage (Small)' AND (description IS NULL OR description = '');

UPDATE products SET description = 'Extra-large dormitory cottage for big groups, events, or family reunions.'
WHERE name = 'Dorm Style Cottage (Large)' AND (description IS NULL OR description = '');
