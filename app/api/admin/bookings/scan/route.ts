import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';

/**
 * POST /api/admin/bookings/scan
 * 
 * Parse a QR code string and look up the corresponding booking.
 * QR format: ALFARM-BK-{id}-{qr_code_hash}
 * 
 * Permission: bookings:checkin
 */
export async function POST(request: NextRequest) {
  const check = await requirePermission(request, 'bookings:checkin');
  if (!check.authorized) return check.response;

  try {
    const body = await request.json();
    const { qr_value } = body;

    if (!qr_value || typeof qr_value !== 'string') {
      return ErrorResponses.validationError('Missing or invalid qr_value');
    }

    // Parse QR format: ALFARM-BK-{id}-{uuid}
    const match = qr_value.match(/^ALFARM-BK-(\d+)-(.+)$/);

    if (!match) {
      return ErrorResponses.validationError(
        'Invalid QR code format. Expected: ALFARM-BK-{id}-{hash}'
      );
    }

    const bookingId = parseInt(match[1], 10);
    const qrHash = match[2];

    if (isNaN(bookingId) || bookingId < 1) {
      return ErrorResponses.validationError('Invalid booking ID in QR code');
    }

    // Look up booking and validate hash
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
        b.guest_first_name,
        b.guest_last_name,
        b.guest_email,
        b.guest_phone,
        b.checked_in_at,
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
      return ErrorResponses.notFound('Booking not found');
    }

    const booking = result.rows[0];

    // Validate QR hash
    if (!booking.qr_code_hash || booking.qr_code_hash !== qrHash) {
      return ErrorResponses.forbidden('QR code hash does not match. This QR may be invalid or tampered.');
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        booking_date: booking.booking_date,
        check_out_date: booking.check_out_date,
        booking_type: booking.booking_type,
        booking_time: booking.booking_time,
        status: booking.status,
        payment_status: booking.payment_status,
        payment_method: booking.payment_method,
        total_amount: parseFloat(booking.total_amount),
        guest_first_name: booking.guest_first_name,
        guest_last_name: booking.guest_last_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        checked_in_at: booking.checked_in_at,
        created_at: booking.created_at,
        items: (booking.items || []).map((item: any) => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal),
        })),
      },
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
