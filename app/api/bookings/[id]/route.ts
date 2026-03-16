import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { authenticateRequest } from '@/lib/authMiddleware';
import { logAuditWithRequest, AuditActions, EntityTypes } from '@/lib/audit';

/**
 * GET /api/bookings/[id]?hash=<qr_code_hash>
 * Fetch a single booking by ID.
 * 
 * ACCESS CONTROL (one of the following must be true):
 * 1. A valid `hash` query param matching the booking's qr_code_hash (used by success page)
 * 2. A valid JWT token where the authenticated user owns the booking
 * 
 * This prevents IDOR — sequential ID enumeration cannot leak PII.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId) || bookingId < 1) {
      return ErrorResponses.validationError('Invalid booking ID');
    }

    const result = await pool.query(
      `SELECT 
        b.id,
        b.user_id,
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
      return ErrorResponses.notFound('Booking not found');
    }

    const booking = result.rows[0];

    // --- ACCESS CONTROL ---
    const hashParam = request.nextUrl.searchParams.get('hash');
    let authorized = false;

    // Method 1: Hash-based access (success page flow)
    if (hashParam && booking.qr_code_hash && hashParam === booking.qr_code_hash) {
      authorized = true;
    }

    // Method 2: JWT ownership check
    if (!authorized) {
      const authResult = await authenticateRequest(request);
      if (authResult.authenticated && authResult.user) {
        if (booking.user_id === authResult.user.id) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return ErrorResponses.forbidden('Access denied. Provide a valid hash or authenticate as the booking owner.');
    }

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

