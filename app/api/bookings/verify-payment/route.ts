import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { retrieveCheckoutSession } from '@/lib/paymongo';
import { sendBookingConfirmationEmail } from '@/lib/email';

/**
 * POST /api/bookings/verify-payment
 *
 * Webhook fallback: The success page calls this endpoint after redirect
 * from PayMongo to verify payment status by polling the PayMongo API directly.
 *
 * This is necessary because PayMongo webhooks require HTTPS, which may not
 * be available during development or on non-HTTPS deployments.
 *
 * Flow:
 * 1. Look up booking by ID + hash (for security)
 * 2. If already confirmed+paid, return immediately
 * 3. Retrieve checkout session from PayMongo API
 * 4. If session is paid, confirm booking + record transaction (same logic as webhook)
 * 5. Return updated payment status
 */
export async function POST(request: NextRequest) {
  let body: { booking_id: number; hash: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id, hash } = body;

  if (!booking_id || !hash) {
    return NextResponse.json({ error: 'booking_id and hash are required' }, { status: 400 });
  }

  // Use a dedicated client for transactional safety
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Look up booking securely by ID + qr_code_hash
    // FOR UPDATE prevents concurrent webhook + verify-payment from both writing
    const bookingResult = await client.query(
      `SELECT id, status, payment_status, payment_method, total_amount,
              paymongo_checkout_session_id, paymongo_payment_id,
              guest_first_name, guest_last_name, guest_email,
              booking_date, check_out_date, booking_type
       FROM bookings
       WHERE id = $1 AND qr_code_hash = $2
       FOR UPDATE`,
      [booking_id, hash]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingResult.rows[0];

    // Already confirmed and paid — return immediately
    if (booking.payment_status === 'paid' && booking.status === 'confirmed') {
      await client.query('ROLLBACK');
      return NextResponse.json({
        verified: true,
        payment_status: 'paid',
        status: 'confirmed',
        message: 'Payment already confirmed',
      });
    }

    // No checkout session ID — can't verify
    if (!booking.paymongo_checkout_session_id) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        verified: false,
        payment_status: booking.payment_status,
        status: booking.status,
        message: 'No checkout session found for this booking',
      });
    }

    // Retrieve checkout session from PayMongo API
    const session = await retrieveCheckoutSession(booking.paymongo_checkout_session_id);
    const sessionStatus = session.attributes.status;
    const payments = session.attributes.payments || [];
    const paidPayment = payments.find(
      (p: any) => p.attributes?.status === 'paid'
    );

    if (!paidPayment || sessionStatus !== 'active') {
      await client.query('ROLLBACK');

      // Not paid yet — check if it's expired
      if (sessionStatus === 'expired') {
        return NextResponse.json({
          verified: false,
          payment_status: 'unpaid',
          status: booking.status,
          message: 'Checkout session has expired',
        });
      }

      return NextResponse.json({
        verified: false,
        payment_status: booking.payment_status,
        status: booking.status,
        message: 'Payment not yet completed',
      });
    }

    // Payment is confirmed via API — update booking (same as webhook handler)
    const paymentId = paidPayment.id;
    const totalAmount = parseFloat(booking.total_amount);

    // Idempotency: double-check before writing (row is locked so this is safe)
    if (booking.payment_status !== 'paid') {
      await client.query(
        `UPDATE bookings
         SET status = 'confirmed',
             payment_status = 'paid',
             paid_amount = $1,
             paymongo_payment_id = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND payment_status != 'paid'`,
        [totalAmount, paymentId, booking.id]
      );

      // Insert payment transaction record (idempotent — check if already exists)
      const existingTx = await client.query(
        `SELECT id FROM payment_transactions
         WHERE booking_id = $1 AND paymongo_payment_id = $2`,
        [booking.id, paymentId]
      );

      if (existingTx.rows.length === 0) {
        await client.query(
          `INSERT INTO payment_transactions (booking_id, type, amount, payment_method, paymongo_payment_id, notes)
           VALUES ($1, 'charge', $2, 'paymongo', $3, $4)`,
          [
            booking.id,
            totalAmount,
            paymentId,
            `PayMongo payment verified via API (session: ${booking.paymongo_checkout_session_id})`,
          ]
        );
      }

      console.log(`Verify-payment: Booking #${booking.id} confirmed+paid via API fallback (Payment: ${paymentId})`);
    }

    await client.query('COMMIT');

    // Send confirmation email outside transaction (fire-and-forget)
    if (booking.payment_status !== 'paid') {
      const itemsResult = await pool.query(
        `SELECT p.name, bi.quantity, bi.subtotal
         FROM booking_items bi
         JOIN products p ON bi.product_id = p.id
         WHERE bi.booking_id = $1`,
        [booking.id]
      );

      sendBookingConfirmationEmail({
        booking_id: booking.id,
        guest_name: `${booking.guest_first_name} ${booking.guest_last_name}`,
        guest_email: booking.guest_email,
        booking_date: booking.booking_date,
        check_out_date: booking.check_out_date,
        booking_type: booking.booking_type,
        total_amount: totalAmount,
        items: itemsResult.rows.map((r: any) => ({
          name: r.name,
          quantity: r.quantity,
          subtotal: parseFloat(r.subtotal),
        })),
        status: 'confirmed',
      }).catch((err) => console.error('Confirmation email failed:', err));
    }

    return NextResponse.json({
      verified: true,
      payment_status: 'paid',
      status: 'confirmed',
      message: 'Payment verified and booking confirmed',
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Verify-payment error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  } finally {
    client.release();
  }
}
