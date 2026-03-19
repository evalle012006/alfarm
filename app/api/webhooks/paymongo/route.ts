import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/paymongo';
import { sendBookingConfirmationEmail } from '@/lib/email';

/**
 * POST /api/webhooks/paymongo
 *
 * Handles PayMongo webhook events.
 * CRITICAL: This is the source of truth for payment confirmation —
 * the client-side success redirect alone is NOT proof of payment.
 *
 * Events handled:
 * - checkout_session.payment.paid → confirm booking, record payment
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('PAYMONGO_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('paymongo-signature');

  if (!signatureHeader) {
    return NextResponse.json({ error: 'Missing Paymongo-Signature header' }, { status: 400 });
  }

  // Verify webhook signature
  const isValid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
  if (!isValid) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Parse the event
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event?.data?.attributes?.type;

  try {
    switch (eventType) {
      case 'checkout_session.payment.paid':
        await handleCheckoutPaymentPaid(event.data.attributes.data);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.data.attributes.data);
        break;

      default:
        // Unhandled event type — acknowledge it so PayMongo doesn't retry
        break;
    }

    return NextResponse.json({ message: 'SUCCESS' }, { status: 200 });
  } catch (error) {
    console.error(`Webhook handler error for ${eventType}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Handle checkout_session.payment.paid
 *
 * 1. Lock booking row (FOR UPDATE) to prevent race with verify-payment
 * 2. Idempotency check — skip if already paid/confirmed
 * 3. Update booking: status=confirmed, payment_status=paid, paid_amount=total
 * 4. Store paymongo_payment_id
 * 5. Insert payment_transaction record
 * 6. COMMIT, then send confirmation email
 */
async function handleCheckoutPaymentPaid(checkoutSession: any) {
  const sessionId = checkoutSession?.id;
  if (!sessionId) {
    console.warn('Webhook: checkout_session.payment.paid missing session ID');
    return;
  }

  // Extract payment ID from the payments array
  const payments = checkoutSession?.attributes?.payments || [];
  const paymentId = payments[0]?.id || null;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Look up booking with FOR UPDATE to serialize with verify-payment
    const bookingResult = await client.query(
      `SELECT id, status, payment_status, total_amount, guest_first_name, guest_last_name,
              guest_email, booking_date, check_out_date, booking_type
       FROM bookings
       WHERE paymongo_checkout_session_id = $1
       FOR UPDATE`,
      [sessionId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.warn(`Webhook: No booking found for session ${sessionId}`);
      return;
    }

    const booking = bookingResult.rows[0];

    // Idempotency: skip if already processed
    if (booking.payment_status === 'paid' && booking.status === 'confirmed') {
      await client.query('ROLLBACK');
      console.log(`Webhook: Booking #${booking.id} already confirmed+paid, skipping`);
      return;
    }

    const totalAmount = parseFloat(booking.total_amount);

    // Update booking
    await client.query(
      `UPDATE bookings
       SET status = 'confirmed',
           payment_status = 'paid',
           paid_amount = $1,
           paymongo_payment_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [totalAmount, paymentId, booking.id]
    );

    // Insert payment transaction record
    await client.query(
      `INSERT INTO payment_transactions (booking_id, type, amount, payment_method, paymongo_payment_id, notes)
       VALUES ($1, 'charge', $2, 'paymongo', $3, $4)`,
      [
        booking.id,
        totalAmount,
        paymentId,
        `PayMongo Checkout Session ${sessionId} paid`,
      ]
    );

    await client.query('COMMIT');

    console.log(`Webhook: Booking #${booking.id} confirmed and paid via PayMongo (Payment: ${paymentId})`);

    // Send confirmation email outside transaction (fire-and-forget)
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
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Handle payment.failed
 *
 * Log the failure — the booking stays in 'pending' status.
 * The cron job will auto-cancel it after 30 minutes if still unpaid.
 */
async function handlePaymentFailed(payment: any) {
  const paymentId = payment?.id;
  console.warn(`Webhook: Payment ${paymentId} failed. Booking will be auto-cancelled by expiry cron if unpaid.`);
}
