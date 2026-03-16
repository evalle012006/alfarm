import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import pool from '@/lib/db';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { ErrorResponses, handleUnexpectedError } from '@/lib/apiErrors';
import { getCurrentUser } from '@/lib/authMiddleware';
import { getStripe, STRIPE_CURRENCY, STRIPE_CHECKOUT_EXPIRY_SECONDS } from '@/lib/stripe';

/**
 * Zod schema — identical to /api/bookings but payment_method is always 'stripe'
 */
const BookingItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(100),
});

const GuestInfoSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().trim().min(7, 'Valid phone number is required (minimum 7 digits)'),
});

const CheckoutSessionPayloadSchema = z.object({
  booking_type: z.enum(['day', 'overnight']),
  booking_date: z.string().datetime({ message: 'Invalid booking date format' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  check_out_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  booking_time: z.string().optional().nullable(),
  guest_info: GuestInfoSchema,
  items: z.array(BookingItemSchema).min(1, 'At least one item is required'),
  special_requests: z.string().max(1000).optional().nullable(),
}).refine(
  (data) => {
    if (data.booking_type === 'overnight') return !!data.check_out_date;
    return true;
  },
  { message: 'Check-out date is required for overnight bookings', path: ['check_out_date'] }
).refine(
  (data) => {
    if (data.booking_type === 'overnight' && data.check_out_date) {
      return new Date(data.check_out_date) > new Date(data.booking_date);
    }
    return true;
  },
  { message: 'Check-out date must be after check-in date', path: ['check_out_date'] }
).refine(
  (data) => {
    const bookingDate = new Date(data.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today;
  },
  { message: 'Booking date cannot be in the past', path: ['booking_date'] }
).refine(
  (data) => {
    if (data.booking_type === 'overnight' && data.check_out_date) {
      const days = Math.ceil((new Date(data.check_out_date).getTime() - new Date(data.booking_date).getTime()) / (1000 * 60 * 60 * 24));
      return days <= 30;
    }
    return true;
  },
  { message: 'Maximum stay is 30 nights', path: ['check_out_date'] }
);

type CheckoutSessionPayload = z.infer<typeof CheckoutSessionPayloadSchema>;

/**
 * POST /api/bookings/checkout-session
 *
 * 1. Validate payload
 * 2. Create booking in DB (pending, unpaid, payment_method='stripe')
 * 3. Create Stripe Checkout Session
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

  // Ensure Stripe is configured
  let stripe;
  try {
    stripe = getStripe();
  } catch {
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
      const userRes = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [guest_info.email]
      );

      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
      } else {
        const newUser = await client.query(
          `INSERT INTO users (email, password, first_name, last_name, phone, role)
           VALUES ($1, $2, $3, $4, $5, 'guest')
           RETURNING id`,
          [
            guest_info.email,
            '$2a$10$placeholderHashForGuestCheckout................',
            guest_info.first_name,
            guest_info.last_name,
            guest_info.phone
          ]
        );
        userId = newUser.rows[0].id;
      }
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'stripe', $10, $11, 0)
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
    const stripeLineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }> = [];

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

      // Build Stripe line item
      // unit_amount is the total per-unit cost in centavos (including night multiplier)
      const unitAmountCentavos = Math.round(
        (pricingUnit === 'per_night' && booking_type === 'overnight'
          ? price * numNights
          : price) * 100
      );

      stripeLineItems.push({
        price_data: {
          currency: STRIPE_CURRENCY,
          product_data: {
            name: displayName,
          },
          unit_amount: unitAmountCentavos,
        },
        quantity: item.quantity,
      });
    }

    // Update total
    await client.query(
      'UPDATE bookings SET total_amount = $1 WHERE id = $2',
      [totalAmount, bookingId]
    );

    // ── STEP 7: Create Stripe Checkout Session ──
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: guest_info.email,
      line_items: stripeLineItems,
      metadata: {
        booking_id: String(bookingId),
        qr_code_hash: qrCodeHash,
      },
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_CHECKOUT_EXPIRY_SECONDS,
      success_url: `${appUrl}/booking/success/${bookingId}?hash=${qrCodeHash}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/booking/checkout?cancelled=true`,
    });

    // Store session ID on booking
    await client.query(
      'UPDATE bookings SET stripe_checkout_session_id = $1 WHERE id = $2',
      [session.id, bookingId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      checkout_url: session.url,
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
