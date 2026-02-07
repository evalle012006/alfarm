import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { handleUnexpectedError } from '@/lib/apiErrors';

/**
 * GET /api/bookings/[id]
 * Public route to fetch a single booking by ID.
 * Used by the booking success/confirmation page.
 * No authentication required — the booking ID acts as a reference number.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId) || bookingId < 1) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT 
        b.id,
        b.booking_date,
        b.check_out_date,
        b.booking_type,
        b.booking_time,
        b.status,
        b.payment_status,
        b.payment_method,
        b.total_amount,
        b.qr_code_hash,
        b.special_requests,
        b.guest_first_name,
        b.guest_last_name,
        b.guest_email,
        b.guest_phone,
        b.created_at,
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
      WHERE b.id = $1
      GROUP BY b.id`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = result.rows[0];

    return NextResponse.json({
      id: booking.id,
      booking_date: booking.booking_date,
      check_out_date: booking.check_out_date,
      booking_type: booking.booking_type,
      booking_time: booking.booking_time,
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      total_amount: parseFloat(booking.total_amount),
      qr_code_hash: booking.qr_code_hash,
      special_requests: booking.special_requests,
      guest: {
        first_name: booking.guest_first_name,
        last_name: booking.guest_last_name,
        email: booking.guest_email,
        phone: booking.guest_phone,
      },
      items: (booking.items || []).map((item: any) => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
      })),
      created_at: booking.created_at,
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
