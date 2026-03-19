import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import pool from '@/lib/db';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { ErrorResponses, handleUnexpectedError } from '@/lib/apiErrors';
import { getCurrentUser } from '@/lib/authMiddleware';
import {
  createCheckoutSession,
  isPayMongoConfigured,
  PAYMONGO_CURRENCY,
  PayMongoLineItem,
} from '@/lib/paymongo';
import { CheckoutSessionPayloadSchema, type CheckoutSessionPayload } from '@/lib/validation/bookingSchemas';

/**
 * POST /api/bookings/checkout-session
 *
 * 1. Validate payload
 * 2. Create booking in DB (pending, unpaid, payment_method='paymongo')
 * 3. Create PayMongo Checkout Session
 * 4. Store session ID on booking
 * 5. Return { checkout_url }
 */
export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResponse = checkRateLimit(
    request,
    RateLimitPresets.booking.limit,
    RateLimitPresets.booking.windowMs
  );
  if (rateLimitResponse) return rateLimitResponse;

  // Ensure PayMongo is configured
  if (!isPayMongoConfigured()) {
    return NextResponse.json(
      { error: 'Online payments are not currently available. Please choose another payment method.' },
      { status: 503 }
    );
  }

  // Validate input
  let body: CheckoutSessionPayload;
  try {
    const rawBody = await request.json();
    body = CheckoutSessionPayloadSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.validationError('Invalid booking data', error.issues);
    }
    return ErrorResponses.validationError('Invalid JSON in request body');
  }

  const {
    guest_info,
    booking_date,
    check_out_date,
    booking_time,
    booking_type,
    items,
    special_requests,
  } = body;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Database transaction
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── STEP 1: Lock products and validate inventory ──
    const lockedProducts = new Map<number, any>();

    for (const item of items) {
      const productLock = await client.query(
        `SELECT id, name, price, pricing_unit, inventory_count, is_active
         FROM products WHERE id = $1 FOR UPDATE`,
        [item.product_id]
      );

      if (productLock.rows.length === 0) {
        await client.query('ROLLBACK');
        return ErrorResponses.notFound(`Product with ID ${item.product_id} not found`);
      }

      const product = productLock.rows[0];
      lockedProducts.set(item.product_id, product);

      if (!product.is_active) {
        await client.query('ROLLBACK');
        return ErrorResponses.conflict(`Product "${product.name}" is currently unavailable`);
      }
    }

    // ── STEP 2: Check availability with date overlap ──
    for (const item of items) {
      const product = lockedProducts.get(item.product_id)!;

      const availQuery = booking_type === 'overnight' && check_out_date
        ? `
          SELECT COALESCE(SUM(bi.quantity), 0)::int as booked
          FROM booking_items bi
          INNER JOIN bookings b ON bi.booking_id = b.id
          WHERE bi.product_id = $1
            AND b.status NOT IN ('cancelled', 'completed')
            AND b.booking_date < $3::date
            AND COALESCE(b.check_out_date, b.booking_date + INTERVAL '1 day') > $2::date
        `
        : `
          SELECT COALESCE(SUM(bi.quantity), 0)::int as booked
          FROM booking_items bi
          INNER JOIN bookings b ON bi.booking_id = b.id
          WHERE bi.product_id = $1
            AND b.status NOT IN ('cancelled', 'completed')
            AND (
              (b.booking_type = 'day' AND b.booking_date = $2::date)
              OR (b.booking_type = 'overnight' AND b.booking_date <= $2::date AND b.check_out_date > $2::date)
            )
        `;

      const availParams = booking_type === 'overnight' && check_out_date
        ? [item.product_id, booking_date, check_out_date]
        : [item.product_id, booking_date];

      const availRes = await client.query(availQuery, availParams);
      const booked = availRes.rows[0]?.booked || 0;
      const remaining = product.inventory_count - booked;

      if (remaining < item.quantity) {
        await client.query('ROLLBACK');
        return ErrorResponses.insufficientInventory(
          `"${product.name}" is not available in the requested quantity. Available: ${remaining}, Requested: ${item.quantity}`
        );
      }
    }

    // ── STEP 3: Identify user ──
    const authenticatedUser = await getCurrentUser(request);
    let userId = authenticatedUser?.id || null;

    if (!userId) {
      // Atomic upsert avoids race condition when two concurrent bookings
      // use the same guest email.
      const upsertRes = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, phone, role, is_shadow)
         VALUES ($1, $2, $3, $4, $5, 'guest', TRUE)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [
          guest_info.email,
          '$2a$10$placeholderHashForGuestCheckout................',
          guest_info.first_name,
          guest_info.last_name,
          guest_info.phone
        ]
      );
      userId = upsertRes.rows[0].id;
    }

    // ── STEP 3b: Duplicate booking prevention ──
    // If the user already has a pending PayMongo booking for the same date/type
    // with an active checkout session, cancel that old booking first so inventory
    // is freed and a fresh session is created.
    const existingPending = await client.query(
      `SELECT id, paymongo_checkout_session_id
       FROM bookings
       WHERE user_id = $1
         AND booking_date = $2::date
         AND booking_type = $3
         AND status = 'pending'
         AND payment_status = 'unpaid'
         AND payment_method = 'paymongo'
         AND paymongo_checkout_session_id IS NOT NULL
       FOR UPDATE`,
      [userId, booking_date, booking_type]
    );

    for (const stale of existingPending.rows) {
      await client.query(
        `UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [stale.id]
      );
    }

    // ── STEP 4: Calculate pricing ──
    let numNights = 1;
    if (booking_type === 'overnight' && check_out_date) {
      numNights = Math.ceil(
        (new Date(check_out_date).getTime() - new Date(booking_date).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // ── STEP 5: Create booking header ──
    const qrCodeHash = randomUUID();

    const bookingRes = await client.query(
      `INSERT INTO bookings (
        user_id,
        guest_first_name, guest_last_name, guest_email, guest_phone,
        booking_date, check_out_date, booking_time, booking_type,
        status, payment_method, special_requests, qr_code_hash, total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'paymongo', $10, $11, 0)
      RETURNING id`,
      [
        userId,
        guest_info.first_name,
        guest_info.last_name,
        guest_info.email,
        guest_info.phone,
        booking_date,
        check_out_date || null,
        booking_time || null,
        booking_type,
        special_requests || null,
        qrCodeHash,
      ]
    );
    const bookingId = bookingRes.rows[0].id;

    // ── STEP 6: Insert booking items ──
    let totalAmount = 0;
    const paymongoLineItems: PayMongoLineItem[] = [];

    for (const item of items) {
      const product = lockedProducts.get(item.product_id)!;
      const price = parseFloat(product.price);
      const pricingUnit = product.pricing_unit;

      let subtotal: number;
      let displayName = product.name;

      if (pricingUnit === 'per_night' && booking_type === 'overnight') {
        subtotal = price * item.quantity * numNights;
        displayName = `${product.name} (${numNights} night${numNights > 1 ? 's' : ''})`;
      } else {
        subtotal = price * item.quantity;
      }

      totalAmount += subtotal;

      await client.query(
        `INSERT INTO booking_items (
          booking_id, product_id, quantity, unit_price, subtotal
        ) VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, item.product_id, item.quantity, price, subtotal]
      );

      // Build PayMongo line item
      // amount is the per-unit cost in centavos (including night multiplier)
      const unitAmountCentavos = Math.round(
        (pricingUnit === 'per_night' && booking_type === 'overnight'
          ? price * numNights
          : price) * 100
      );

      paymongoLineItems.push({
        name: displayName,
        amount: unitAmountCentavos,
        currency: PAYMONGO_CURRENCY,
        quantity: item.quantity,
      });
    }

    // Update total
    await client.query(
      'UPDATE bookings SET total_amount = $1 WHERE id = $2',
      [totalAmount, bookingId]
    );

    // ── STEP 7: Create PayMongo Checkout Session ──
    const session = await createCheckoutSession({
      line_items: paymongoLineItems,
      payment_method_types: ['card', 'gcash', 'grab_pay', 'paymaya'],
      description: `AlFarm Booking #${bookingId}`,
      success_url: `${appUrl}/booking/success/${bookingId}?hash=${qrCodeHash}`,
      cancel_url: `${appUrl}/booking/checkout?cancelled=true`,
      metadata: {
        booking_id: String(bookingId),
        qr_code_hash: qrCodeHash,
      },
    });

    // Store session ID on booking
    await client.query(
      'UPDATE bookings SET paymongo_checkout_session_id = $1 WHERE id = $2',
      [session.id, bookingId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      checkout_url: session.attributes.checkout_url,
      booking_id: bookingId,
      session_id: session.id,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    return handleUnexpectedError(error);
  } finally {
    client.release();
  }
}
