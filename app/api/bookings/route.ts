import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import pool from '@/lib/db';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { ErrorResponses, handleUnexpectedError } from '@/lib/apiErrors';
import { getCurrentUser } from '@/lib/authMiddleware';
import { GuestBookingPayloadSchema, type GuestBookingPayload } from '@/lib/validation/bookingSchemas';

/**
 * POST /api/bookings
 * Create a new booking with concurrency protection
 * 
 * CRITICAL FEATURES:
 * - Row-level locking (FOR UPDATE) prevents overselling
 * - Zod validation ensures data integrity
 * - Rate limiting prevents abuse
 * - Standardized error responses
 */
export async function POST(request: NextRequest) {
  // ============================================
  // RATE LIMITING
  // ============================================
  const rateLimitResponse = checkRateLimit(
    request,
    RateLimitPresets.booking.limit,
    RateLimitPresets.booking.windowMs
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // ============================================
  // INPUT VALIDATION (Zod)
  // ============================================
  let body: GuestBookingPayload;

  try {
    const rawBody = await request.json();
    body = GuestBookingPayloadSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.validationError(
        'Invalid booking data',
        error.issues
      );
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
    payment_method,
  } = body;

  // ============================================
  // DATABASE TRANSACTION WITH ROW-LEVEL LOCKING
  // ============================================
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ============================================
    // STEP 1: LOCK PRODUCTS AND VALIDATE INVENTORY
    // CRITICAL: FOR UPDATE prevents concurrent overselling
    // ============================================
    const lockedProducts = new Map<number, any>();

    for (const item of items) {
      // Lock the product row for this transaction
      const productLock = await client.query(
        `SELECT id, name, price, pricing_unit, inventory_count, is_active
         FROM products 
         WHERE id = $1
         FOR UPDATE`,
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

    // ============================================
    // STEP 2: CHECK AVAILABILITY WITH DATE OVERLAP
    // Uses locked inventory_count from previous step
    // ============================================
    for (const item of items) {
      const product = lockedProducts.get(item.product_id)!;

      // Calculate booked quantity for date range
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

      // CRITICAL: Inventory check with locked value
      if (remaining < item.quantity) {
        await client.query('ROLLBACK');
        return ErrorResponses.insufficientInventory(
          `"${product.name}" is not available in the requested quantity. ` +
          `Available: ${remaining}, Requested: ${item.quantity}`
        );
      }
    }

    // ============================================
    // STEP 3: IDENTIFY USER (AUTHENTICATED OR SHADOW ACCOUNT)
    // ============================================
    const authenticatedUser = await getCurrentUser(request);
    let userId = authenticatedUser?.id || null;

    if (!userId) {
      // Not authenticated — find or create shadow account atomically.
      // INSERT ... ON CONFLICT avoids race conditions when two concurrent
      // bookings use the same guest email.
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

    // ============================================
    // STEP 4: CALCULATE PRICING
    // ============================================
    let numNights = 1;
    if (booking_type === 'overnight' && check_out_date) {
      const checkIn = new Date(booking_date);
      const checkOut = new Date(check_out_date);
      numNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }

    // ============================================
    // STEP 5: CREATE BOOKING HEADER
    // ============================================
    const qrCodeHash = randomUUID();

    const bookingRes = await client.query(
      `INSERT INTO bookings (
        user_id, 
        guest_first_name, guest_last_name, guest_email, guest_phone,
        booking_date, check_out_date, booking_time, booking_type,
        status, payment_method, special_requests, qr_code_hash, total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, 0)
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
        payment_method,
        special_requests || null,
        qrCodeHash,
      ]
    );
    const bookingId = bookingRes.rows[0].id;

    // ============================================
    // STEP 6: INSERT BOOKING ITEMS
    // Use locked product data from Step 1
    // ============================================
    let totalAmount = 0;
    for (const item of items) {
      const product = lockedProducts.get(item.product_id)!;
      const price = parseFloat(product.price);
      const pricingUnit = product.pricing_unit;

      // Calculate subtotal based on pricing unit
      let subtotal: number;
      if (pricingUnit === 'per_night' && booking_type === 'overnight') {
        subtotal = price * item.quantity * numNights;
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
    }

    // ============================================
    // STEP 7: UPDATE TOTAL AND COMMIT
    // ============================================
    await client.query(
      'UPDATE bookings SET total_amount = $1 WHERE id = $2',
      [totalAmount, bookingId]
    );

    await client.query('COMMIT');

    // ============================================
    // STEP 8: SEND CONFIRMATION EMAIL (NON-BLOCKING)
    // ============================================
    const itemsForEmail = items.map((item: { product_id: number; quantity: number }) => {
      const product = lockedProducts.get(item.product_id)!;
      const price = parseFloat(product.price);
      const isPerNight = product.pricing_unit === 'per_night' && booking_type === 'overnight';
      const subtotal = price * item.quantity * (isPerNight ? numNights : 1);
      return {
        name: product.name,
        quantity: item.quantity,
        subtotal,
      };
    });

    sendBookingConfirmationEmail({
      booking_id: bookingId,
      guest_name: `${guest_info.first_name} ${guest_info.last_name}`,
      guest_email: guest_info.email,
      booking_date,
      check_out_date: check_out_date || null,
      booking_type: booking_type,
      total_amount: totalAmount,
      items: itemsForEmail,
      status: 'pending',
    }).catch((err) => console.error('Email send failed:', err));

    return NextResponse.json({
      booking_id: bookingId,
      message: 'Booking created successfully',
      booking_type: booking_type,
      check_in: booking_date,
      check_out: check_out_date || null,
      nights: booking_type === 'overnight' ? numNights : null,
      total_amount: totalAmount,
      qr_code_hash: qrCodeHash,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    return handleUnexpectedError(error);
  } finally {
    client.release();
  }
}
