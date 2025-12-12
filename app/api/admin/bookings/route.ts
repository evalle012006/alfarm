import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/authMiddleware';

// GET - List all bookings (admin only)
export async function GET(request: NextRequest) {
  const { response, user } = requireRole(request, ['admin', 'root']);
  if (response) return response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        b.id,
        b.user_id,
        b.booking_date,
        b.check_out_date,
        b.booking_type,
        b.booking_time,
        b.status,
        b.payment_status,
        b.total_amount,
        b.guest_first_name,
        b.guest_last_name,
        b.guest_email,
        b.guest_phone,
        b.special_requests,
        b.qr_code_hash,
        b.created_at,
        b.updated_at,
        json_agg(
          json_build_object(
            'id', bi.id,
            'product_id', bi.product_id,
            'product_name', p.name,
            'category', c.name,
            'quantity', bi.quantity,
            'unit_price', bi.unit_price,
            'subtotal', bi.subtotal
          )
        ) FILTER (WHERE bi.id IS NOT NULL) as items
      FROM bookings b
      LEFT JOIN booking_items bi ON b.id = bi.booking_id
      LEFT JOIN products p ON bi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (date) {
      query += ` AND b.booking_date = $${paramIndex}::date`;
      params.push(date);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        b.guest_first_name ILIKE $${paramIndex} OR 
        b.guest_last_name ILIKE $${paramIndex} OR 
        b.guest_email ILIKE $${paramIndex} OR
        b.guest_phone ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM bookings WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (date) {
      countQuery += ` AND booking_date = $${countParamIndex}::date`;
      countParams.push(date);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (
        guest_first_name ILIKE $${countParamIndex} OR 
        guest_last_name ILIKE $${countParamIndex} OR 
        guest_email ILIKE $${countParamIndex} OR
        guest_phone ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    const bookings = result.rows.map(booking => ({
      ...booking,
      total_amount: parseFloat(booking.total_amount),
      items: (booking.items || []).map((item: any) => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
      })),
    }));

    return NextResponse.json({
      bookings,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + bookings.length < totalCount,
      },
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST - Create booking (admin can create on behalf of guests)
export async function POST(request: NextRequest) {
  const { response, user } = requireRole(request, ['admin', 'root']);
  if (response) return response;

  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      guest_info,
      booking_date,
      check_out_date,
      booking_time,
      booking_type,
      items,
      status: initialStatus,
      payment_status,
      special_requests,
    } = body;

    // Basic validation
    if (!guest_info || !booking_date || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    const type = booking_type || 'day';

    await client.query('BEGIN');

    // Find or create user
    let userId = null;
    const userRes = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [guest_info.email]
    );

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
    } else {
      const newUser = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, phone, role)
         VALUES ($1, $2, $3, $4, $5, 'guest')
         RETURNING id`,
        [
          guest_info.email,
          '$2a$10$placeholderHashForGuestCheckout................',
          guest_info.first_name,
          guest_info.last_name,
          guest_info.phone
        ]
      );
      userId = newUser.rows[0].id;
    }

    // Calculate nights
    let numNights = 1;
    if (type === 'overnight' && check_out_date) {
      const checkIn = new Date(booking_date);
      const checkOut = new Date(check_out_date);
      numNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Create booking
    const bookingRes = await client.query(
      `INSERT INTO bookings (
        user_id, 
        guest_first_name, guest_last_name, guest_email, guest_phone,
        booking_date, check_out_date, booking_time, booking_type,
        status, payment_status, special_requests, total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
      RETURNING id`,
      [
        userId,
        guest_info.first_name,
        guest_info.last_name,
        guest_info.email,
        guest_info.phone,
        booking_date,
        check_out_date || null,
        booking_time || null,
        type,
        initialStatus || 'confirmed', // Admin bookings default to confirmed
        payment_status || 'unpaid',
        special_requests || null
      ]
    );
    const bookingId = bookingRes.rows[0].id;

    // Insert items
    let totalAmount = 0;
    for (const item of items) {
      const productRes = await client.query(
        'SELECT price, pricing_unit FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productRes.rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const price = parseFloat(productRes.rows[0].price);
      const pricingUnit = productRes.rows[0].pricing_unit;

      let subtotal: number;
      if (pricingUnit === 'per_night' && type === 'overnight') {
        subtotal = price * item.quantity * numNights;
      } else {
        subtotal = price * item.quantity;
      }

      totalAmount += subtotal;

      await client.query(
        `INSERT INTO booking_items (
          booking_id, product_id, quantity, unit_price, subtotal
        ) VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, item.product_id, item.quantity, price, subtotal]
      );
    }

    // Update total
    await client.query(
      'UPDATE bookings SET total_amount = $1 WHERE id = $2',
      [totalAmount, bookingId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      booking_id: bookingId,
      message: 'Booking created successfully',
      total_amount: totalAmount,
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin booking creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
