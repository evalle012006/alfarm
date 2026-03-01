import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { handleUnexpectedError } from '@/lib/apiErrors';
import { authenticateRequest } from '@/lib/authMiddleware';
import { logAuditWithRequest, AuditActions, EntityTypes } from '@/lib/audit';

/**
 * POST /api/bookings/[id]/cancel
 * Guest-facing cancellation route.
 * Requires ownership of the booking, 'pending' status, and accepts an optional reason.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const bookingId = parseInt(params.id);
        if (isNaN(bookingId) || bookingId < 1) {
            return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
        }

        // Authenticate the user
        const authResult = authenticateRequest(request);
        if (!authResult.authenticated || !authResult.user) {
            return NextResponse.json(
                { error: authResult.error || 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if the user owns the booking
        const bookingCheck = await pool.query(
            'SELECT user_id, status FROM bookings WHERE id = $1',
            [bookingId]
        );

        if (bookingCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const booking = bookingCheck.rows[0];

        // Verify ownership
        if (booking.user_id !== authResult.user.id) {
            return NextResponse.json({ error: 'Forbidden: You do not own this booking' }, { status: 403 });
        }

        // Must be pending
        if (booking.status !== 'pending') {
            return NextResponse.json(
                { error: 'Only pending bookings can be cancelled by the user' },
                { status: 400 }
            );
        }

        // Parse body for optional reason
        let reason = 'User cancelled from dashboard';
        try {
            const body = await request.json();
            if (body.reason && typeof body.reason === 'string' && body.reason.trim() !== '') {
                reason = `User cancelled from dashboard - Reason: ${body.reason.trim()}`;
            }
        } catch (e) {
            // Body reading is optional
        }

        await pool.query(
            "UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
            [bookingId]
        );

        // Log audit
        await logAuditWithRequest(request, {
            actorUserId: authResult.user.id,
            actorEmail: authResult.user.email,
            action: AuditActions.BOOKING_CANCEL,
            entityType: EntityTypes.BOOKING,
            entityId: bookingId,
            metadata: {
                reason: reason,
                previousStatus: booking.status,
                newStatus: 'cancelled'
            }
        });

        return NextResponse.json({ message: 'Booking cancelled successfully' });

    } catch (error) {
        return handleUnexpectedError(error);
    }
}
