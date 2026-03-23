import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';

/**
 * PATCH /api/admin/bookings/[id]/notes
 * 
 * Update staff notes for a booking.
 * Permission: bookings:update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'bookings:update');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
    }

    const body = await request.json();
    const { notes } = body;

    if (notes === undefined) {
      return ErrorResponses.validationError('Notes field is required');
    }

    // Get current booking for audit snapshot
    const existing = await pool.query(
      'SELECT id, notes, guest_first_name, guest_last_name FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (existing.rows.length === 0) {
      return ErrorResponses.notFound('Booking not found');
    }

    const previousNotes = existing.rows[0].notes;

    const result = await pool.query(
      `UPDATE bookings 
       SET notes = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, notes, updated_at`,
      [notes, bookingId]
    );

    // Audit log
    logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.BOOKING_UPDATE,
      entityType: EntityTypes.BOOKING,
      entityId: bookingId,
      metadata: {
        ...createSnapshot(
          { notes: previousNotes },
          { notes: result.rows[0].notes }
        ),
        guestName: `${existing.rows[0].guest_first_name} ${existing.rows[0].guest_last_name}`,
        field: 'notes',
      },
    }).catch((err) => console.error('Audit log failed:', err));

    return NextResponse.json({
      message: 'Notes updated successfully',
      booking: result.rows[0],
    });

  } catch (error) {
    console.error('Error updating booking notes:', error);
    return handleUnexpectedError(error);
  }
}
