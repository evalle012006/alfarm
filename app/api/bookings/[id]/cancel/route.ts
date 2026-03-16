import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { authenticateRequest } from '@/lib/authMiddleware';
import { logAuditWithRequest, AuditActions, EntityTypes } from '@/lib/audit';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { sendBookingCancellationEmail } from '@/lib/email';

/**
 * POST /api/bookings/[id]/cancel
 * Guest-facing cancellation route.
 * Requires ownership of the booking, 'pending' status, and accepts an optional reason.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Rate limit: 5 cancellations per hour
        const rateLimited = checkRateLimit(request, RateLimitPresets.cancellation.limit, RateLimitPresets.cancellation.windowMs);
        if (rateLimited) return rateLimited;

        const { id } = await params;
        const bookingId = parseInt(id);
        if (isNaN(bookingId) || bookingId < 1) {
            return ErrorResponses.validationError('Invalid booking ID');
        }

        // Authenticate the user
        const authResult = await authenticateRequest(request);
        if (!authResult.authenticated || !authResult.user) {
            return ErrorResponses.authenticationRequired(authResult.error || 'Unauthorized');
        }

        // Check if the user owns the booking
        const bookingCheck = await pool.query(
            'SELECT user_id, status FROM bookings WHERE id = $1',
            [bookingId]
        );

        if (bookingCheck.rows.length === 0) {
            return ErrorResponses.notFound('Booking not found');
        }

        const booking = bookingCheck.rows[0];

        // Verify ownership
        if (booking.user_id !== authResult.user.id) {
            return ErrorResponses.forbidden('You do not own this booking');
        }

        // Must be pending
        if (booking.status !== 'pending') {
            return ErrorResponses.validationError('Only pending bookings can be cancelled by the user');
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

        // Fire-and-forget cancellation email
        const bookingDetails = await pool.query(
            `SELECT b.*, u.email as user_email
             FROM bookings b
             LEFT JOIN users u ON b.user_id = u.id
             WHERE b.id = $1`,
            [bookingId]
        );
        if (bookingDetails.rows.length > 0) {
            const b = bookingDetails.rows[0];
            const email = b.guest_email || b.user_email;
            if (email) {
                sendBookingCancellationEmail({
                    to: email,
                    guestName: `${b.guest_first_name || ''} ${b.guest_last_name || ''}`.trim() || 'Guest',
                    bookingId: b.id,
                    bookingDate: b.booking_date,
                    reason: reason,
                }).catch((err: unknown) => console.error('Failed to send cancellation email:', err));
            }
        }

        return NextResponse.json({ message: 'Booking cancelled successfully' });

    } catch (error) {
        return handleUnexpectedError(error);
    }
}
