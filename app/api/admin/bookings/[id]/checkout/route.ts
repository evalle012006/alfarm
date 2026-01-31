import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';

/**
 * POST /api/admin/bookings/[id]/checkout
 * 
 * Check out a guest from their booking.
 * Permission: bookings:checkout
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // RBAC: Require bookings:checkout permission
  const check = await requirePermission(request, 'bookings:checkout');
  if (!check.authorized) return check.response;

  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
    }

    // Get current booking state
    const existingResult = await pool.query(
      `SELECT id, status, checked_in_at, checked_out_at, guest_first_name, guest_last_name
       FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (existingResult.rows.length === 0) {
      return ErrorResponses.notFound('Booking not found');
    }

    const booking = existingResult.rows[0];

    // Validate booking can be checked out
    if (booking.status === 'cancelled') {
      return ErrorResponses.validationError('Cannot check out a cancelled booking');
    }

    if (booking.status === 'checked_out' || booking.status === 'completed') {
      return ErrorResponses.validationError('Booking has already been checked out');
    }

    if (!booking.checked_in_at) {
      return ErrorResponses.validationError('Guest must be checked in before checkout');
    }

    if (booking.checked_out_at) {
      return ErrorResponses.validationError('Booking has already been checked out');
    }

    // Update booking
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'checked_out',
           checked_out_at = CURRENT_TIMESTAMP,
           checked_out_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, status, checked_out_at, checked_out_by, updated_at`,
      [check.user.id, bookingId]
    );

    const updatedBooking = result.rows[0];

    // Log audit
    await logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.BOOKING_CHECKOUT,
      entityType: EntityTypes.BOOKING,
      entityId: bookingId,
      metadata: {
        ...createSnapshot(
          { status: booking.status, checkedOutAt: booking.checked_out_at },
          { status: updatedBooking.status, checkedOutAt: updatedBooking.checked_out_at }
        ),
        guestName: `${booking.guest_first_name} ${booking.guest_last_name}`,
      },
    });

    return NextResponse.json({
      message: 'Guest checked out successfully',
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        checkedOutAt: updatedBooking.checked_out_at,
        checkedOutBy: updatedBooking.checked_out_by,
      },
    });

  } catch (error) {
    console.error('Error checking out booking:', error);
    return handleUnexpectedError(error);
  }
}
