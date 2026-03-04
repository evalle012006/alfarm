import pool from './lib/db';

async function syncProducts() {
    try {
        // 1. Update existing products with image URLs and ensure names match my UI
        const updates = [
            { name: 'Blue Room (AC)', img: '/images/accommodation/blue_room/blue_room_1.jpeg' },
            { name: 'Dorm Style Cottage (Large)', img: '/images/accommodation/dorm_style_cottage/dorm_style_cottage_1.jpeg' },
            { name: 'Orange Terrace', img: '/images/accommodation/orange_terrace/orange_terrace_1.jpeg' },
            { name: 'Native Style Cottage', img: '/images/accommodation/native_style_room/native_style_room_1.jpeg' },
            { name: 'Mini Rest House', img: '/images/accommodation/mini_resthouse/mini_resthouse_1.jpeg' },
            { name: 'Function Hall', img: '/images/accommodation/function_hall/function_hall_1.jpeg' },
            { name: 'Screen Cottage (Large)', img: '/images/accommodation/screen_cottages/screen_cottages_1.jpeg' },
            { name: 'Poolside Table', img: '/images/accommodation/tables/table_1.jpeg' },
        ];

        for (const item of updates) {
            await pool.query(
                'UPDATE products SET image_url = $1 WHERE name = $2',
                [item.img, item.name]
            );
        }

        // 2. Add missing products
        const categoryResult = await pool.query("SELECT id FROM categories WHERE name = 'Accommodations' OR name = 'Accommodation' LIMIT 1");
        const categoryId = categoryResult.rows[0]?.id || 2;

        const missing = [
            { name: 'Yellow Terrace Standard', price: 2800, capacity: 4, type: 'room', time_slot: 'night', img: '/images/accommodation/yellow_terrace/yellow_terrace_1.jpeg' },
            { name: 'Yellow Terrace Deluxe', price: 3500, capacity: 6, type: 'room', time_slot: 'night', img: '/images/accommodation/yellow_terrace_1/yellow_terrace_11.jpeg' },
            { name: 'Rest House', price: 8500, capacity: 15, type: 'room', time_slot: 'night', img: '/images/accommodation/rest_house/rest_house_1.jpeg' },
        ];

        for (const item of missing) {
            await pool.query(
                `INSERT INTO products (category_id, name, price, capacity, pricing_unit, time_slot, image_url, is_active)
         VALUES ($1, $2, $3, $4, 'per_night', 'night', $5, true)
         ON CONFLICT (name) DO UPDATE SET price = $3, capacity = $4, image_url = $5`,
                [categoryId, item.name, item.price, item.capacity, item.img]
            );
        }

        console.log('Database sync complete!');
    } catch (err) {
        console.error('Error syncing database:', err);
    } finally {
        process.exit();
    }
}

syncProducts();
