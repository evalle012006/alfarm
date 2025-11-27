import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { guest_info, booking_date, booking_time, items } = body;

    // Basic Validation
    if (!guest_info || !booking_date || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // 1. Create User (Shadow Account) or Update Existing
    // We check by email. If exists, we associate. If not, we create a "guest" user.
    // NOTE: In a real app, we might want to force registration or handle this more carefully.
    let userId = null;
    const userRes = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [guest_info.email]
    );

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
    } else {
      // Create shadow user
      // Password is a placeholder since they haven't registered properly yet
      // In production, send an email with a "Set Password" link
      const newUser = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, phone, role)
         VALUES ($1, $2, $3, $4, $5, 'guest')
         RETURNING id`,
        [
          guest_info.email, 
          '$2a$10$placeholderHashForGuestCheckout................', // Invalid hash
          guest_info.first_name,
          guest_info.last_name,
          guest_info.phone
        ]
      );
      userId = newUser.rows[0].id;
    }

    // 2. Calculate Total & Verify Inventory (Double Check)
    let totalAmount = 0;

    // 3. Create Booking Header
    const bookingRes = await client.query(
      `INSERT INTO bookings (
        user_id, 
        guest_first_name, guest_last_name, guest_email, guest_phone,
        booking_date, booking_time, 
        status, total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0)
      RETURNING id`,
      [
        userId,
        guest_info.first_name,
        guest_info.last_name,
        guest_info.email,
        guest_info.phone,
        booking_date,
        booking_time || null
      ]
    );
    const bookingId = bookingRes.rows[0].id;

    // 4. Insert Items
    for (const item of items) {
      // Fetch current price to lock it in
      const productRes = await client.query(
        'SELECT price FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productRes.rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const price = parseFloat(productRes.rows[0].price);
      const subtotal = price * item.quantity;
      totalAmount += subtotal;

      await client.query(
        `INSERT INTO booking_items (
          booking_id, product_id, quantity, unit_price, subtotal
        ) VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, item.product_id, item.quantity, price, subtotal]
      );
    }

    // 5. Update Total Amount
    await client.query(
      'UPDATE bookings SET total_amount = $1 WHERE id = $2',
      [totalAmount, bookingId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      booking_id: bookingId,
      message: 'Booking created successfully',
      total_amount: totalAmount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
