import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';

/**
 * POST /api/admin/bookings/[id]/checkin
 * 
 * Check in a guest for their booking.
 * Permission: bookings:checkin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // RBAC: Require bookings:checkin permission
  const check = await requirePermission(request, 'bookings:checkin');
  if (!check.authorized) return check.response;

  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
    }

    // Get current booking state
    const existingResult = await pool.query(
      `SELECT id, status, checked_in_at, guest_first_name, guest_last_name
       FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (existingResult.rows.length === 0) {
      return ErrorResponses.notFound('Booking not found');
    }

    const booking = existingResult.rows[0];

    // Validate booking can be checked in
    if (booking.status === 'cancelled') {
      return ErrorResponses.validationError('Cannot check in a cancelled booking');
    }

    if (booking.status === 'checked_in' || booking.status === 'checked_out' || booking.status === 'completed') {
      return ErrorResponses.validationError(`Booking is already ${booking.status.replace('_', ' ')}`);
    }

    if (booking.checked_in_at) {
      return ErrorResponses.validationError('Booking has already been checked in');
    }

    // Update booking
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'checked_in',
           checked_in_at = CURRENT_TIMESTAMP,
           checked_in_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, status, checked_in_at, checked_in_by, updated_at`,
      [check.user.id, bookingId]
    );

    const updatedBooking = result.rows[0];

    // Log audit
    await logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.BOOKING_CHECKIN,
      entityType: EntityTypes.BOOKING,
      entityId: bookingId,
      metadata: {
        ...createSnapshot(
          { status: booking.status, checkedInAt: booking.checked_in_at },
          { status: updatedBooking.status, checkedInAt: updatedBooking.checked_in_at }
        ),
        guestName: `${booking.guest_first_name} ${booking.guest_last_name}`,
      },
    });

    return NextResponse.json({
      message: 'Guest checked in successfully',
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        checkedInAt: updatedBooking.checked_in_at,
        checkedInBy: updatedBooking.checked_in_by,
      },
    });

  } catch (error) {
    console.error('Error checking in booking:', error);
    return handleUnexpectedError(error);
  }
}
