import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticateRequest } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  // Authenticate the request
  const authResult = await authenticateRequest(request);

  if (!authResult.authenticated || !authResult.user) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // Filter by status
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query based on user role
    let query = `
      SELECT 
        b.id,
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
        ) as items
      FROM bookings b
      LEFT JOIN booking_items bi ON b.id = bi.booking_id
      LEFT JOIN products p ON bi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE b.user_id = $1
    `;

    const params: any[] = [authResult.user.id];
    let paramIndex = 2;

    // Filter by status if provided
    if (status && ['pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled'].includes(status)) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += `
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM bookings WHERE user_id = $1`;
    const countParams: any[] = [authResult.user.id];
    
    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Format the response
    const bookings = result.rows.map(booking => ({
      id: booking.id,
      booking_date: booking.booking_date,
      check_out_date: booking.check_out_date,
      booking_type: booking.booking_type,
      booking_time: booking.booking_time,
      status: booking.status,
      payment_status: booking.payment_status,
      total_amount: parseFloat(booking.total_amount),
      guest: {
        first_name: booking.guest_first_name,
        last_name: booking.guest_last_name,
        email: booking.guest_email,
        phone: booking.guest_phone,
      },
      special_requests: booking.special_requests,
      items: booking.items.filter((item: any) => item.id !== null).map((item: any) => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
      })),
      created_at: booking.created_at,
      updated_at: booking.updated_at,
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
    console.error('Error fetching booking history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking history' },
      { status: 500 }
    );
  }
}
