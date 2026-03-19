import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { expireCheckoutSession, PAYMONGO_CHECKOUT_EXPIRY_MINUTES } from '@/lib/paymongo';

/**
 * POST /api/cron/expire-bookings
 *
 * Cancels pending PayMongo bookings that have not been paid within
 * the configured expiry window (default 30 minutes).
 *
 * PayMongo does not send a `checkout.session.expired` webhook like Stripe,
 * so this endpoint must be called periodically by an external cron service
 * (e.g., Vercel Cron, cron-job.org, or system crontab).
 *
 * Recommended interval: every 5 minutes.
 *
 * Security: Protected by a shared CRON_SECRET token.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find pending PayMongo bookings older than the expiry window
    const expiryMinutes = PAYMONGO_CHECKOUT_EXPIRY_MINUTES;

    const staleBookings = await pool.query(
      `SELECT id, paymongo_checkout_session_id
       FROM bookings
       WHERE status = 'pending'
         AND payment_method = 'paymongo'
         AND payment_status = 'unpaid'
         AND created_at < NOW() - ($1 || ' minutes')::interval`,
      [expiryMinutes]
    );

    if (staleBookings.rows.length === 0) {
      return NextResponse.json({ expired: 0, message: 'No stale bookings found' });
    }

    let expiredCount = 0;

    for (const booking of staleBookings.rows) {
      try {
        // Expire the PayMongo checkout session (best-effort)
        if (booking.paymongo_checkout_session_id) {
          await expireCheckoutSession(booking.paymongo_checkout_session_id).catch((err) => {
            // Session may already be expired or paid — that's OK
            console.warn(`Could not expire PayMongo session ${booking.paymongo_checkout_session_id}:`, err.message);
          });
        }

        // Cancel the booking
        await pool.query(
          `UPDATE bookings
           SET status = 'cancelled',
               notes = COALESCE(notes, '') || E'\n[' || NOW()::text || '] Auto-cancelled: PayMongo checkout session expired (unpaid after ' || $1 || ' min)',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND status = 'pending'`,
          [expiryMinutes, booking.id]
        );

        expiredCount++;
        console.log(`Cron: Booking #${booking.id} auto-cancelled (unpaid PayMongo session expired)`);
      } catch (err) {
        console.error(`Cron: Failed to expire booking #${booking.id}:`, err);
      }
    }

    return NextResponse.json({
      expired: expiredCount,
      checked: staleBookings.rows.length,
      message: `Expired ${expiredCount} stale PayMongo bookings`,
    });
  } catch (error) {
    console.error('Cron expire-bookings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
