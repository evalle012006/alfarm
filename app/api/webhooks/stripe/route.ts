import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import pool from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { sendBookingConfirmationEmail } from '@/lib/email';

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events.
 * CRITICAL: This is the source of truth for payment confirmation —
 * the client-side success redirect alone is NOT proof of payment.
 *
 * Events handled:
 * - checkout.session.completed → confirm booking, record payment
 * - checkout.session.expired   → cancel unpaid booking (30 min TTL)
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        // Unhandled event type — acknowledge it so Stripe doesn't retry
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Handle checkout.session.completed
 *
 * 1. Look up booking by stripe_checkout_session_id
 * 2. Idempotency check — skip if already paid/confirmed
 * 3. Update booking: status=confirmed, payment_status=paid, paid_amount=total
 * 4. Store stripe_payment_intent_id
 * 5. Insert payment_transaction record
 * 6. Send confirmation email
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const sessionId = session.id;
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // Look up booking
  const bookingResult = await pool.query(
    `SELECT id, status, payment_status, total_amount, guest_first_name, guest_last_name,
            guest_email, booking_date, check_out_date, booking_type
     FROM bookings
     WHERE stripe_checkout_session_id = $1`,
    [sessionId]
  );

  if (bookingResult.rows.length === 0) {
    console.warn(`Webhook: No booking found for session ${sessionId}`);
    return;
  }

  const booking = bookingResult.rows[0];

  // Idempotency: skip if already processed
  if (booking.payment_status === 'paid' && booking.status === 'confirmed') {
    console.log(`Webhook: Booking #${booking.id} already confirmed+paid, skipping`);
    return;
  }

  const totalAmount = parseFloat(booking.total_amount);

  // Update booking
  await pool.query(
    `UPDATE bookings
     SET status = 'confirmed',
         payment_status = 'paid',
         paid_amount = $1,
         stripe_payment_intent_id = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [totalAmount, paymentIntentId, booking.id]
  );

  // Insert payment transaction record
  await pool.query(
    `INSERT INTO payment_transactions (booking_id, type, amount, payment_method, stripe_payment_intent_id, notes)
     VALUES ($1, 'charge', $2, 'stripe', $3, $4)`,
    [
      booking.id,
      totalAmount,
      paymentIntentId,
      `Stripe Checkout Session ${sessionId} completed`,
    ]
  );

  console.log(`Webhook: Booking #${booking.id} confirmed and paid via Stripe (PI: ${paymentIntentId})`);

  // Send confirmation email (fire-and-forget)
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

/**
 * Handle checkout.session.expired
 *
 * If the guest didn't complete payment within 30 minutes,
 * cancel the pending booking to release inventory.
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const sessionId = session.id;

  const bookingResult = await pool.query(
    `SELECT id, status FROM bookings WHERE stripe_checkout_session_id = $1`,
    [sessionId]
  );

  if (bookingResult.rows.length === 0) {
    console.warn(`Webhook: No booking found for expired session ${sessionId}`);
    return;
  }

  const booking = bookingResult.rows[0];

  // Only cancel if still pending — don't cancel if already confirmed/etc.
  if (booking.status !== 'pending') {
    console.log(`Webhook: Booking #${booking.id} status is '${booking.status}', not cancelling`);
    return;
  }

  await pool.query(
    `UPDATE bookings
     SET status = 'cancelled',
         notes = COALESCE(notes, '') || E'\n[' || NOW()::text || '] Auto-cancelled: Stripe checkout session expired',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [booking.id]
  );

  console.log(`Webhook: Booking #${booking.id} cancelled due to expired Stripe session`);
}
