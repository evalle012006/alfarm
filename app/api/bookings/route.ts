import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import pool from '@/lib/db';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { ErrorResponses, handleUnexpectedError } from '@/lib/apiErrors';
import { getCurrentUser } from '@/lib/authMiddleware';

/**
 * Zod schema for booking creation payload
 * Validates all input before processing
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

const BookingPayloadSchema = z.object({
  booking_type: z.enum(['day', 'overnight']),
  booking_date: z.string().datetime({ message: 'Invalid booking date format' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  check_out_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  booking_time: z.string().optional().nullable(),
  guest_info: GuestInfoSchema,
  items: z.array(BookingItemSchema).min(1, 'At least one item is required'),
  special_requests: z.string().max(1000).optional().nullable(),
  payment_method: z.enum(['cash', 'gcash', 'paymaya']).default('cash'),
}).refine(
  (data) => {
    // Overnight bookings must have check_out_date
    if (data.booking_type === 'overnight') {
      return !!data.check_out_date;
    }
    return true;
  },
  {
    message: 'Check-out date is required for overnight bookings',
    path: ['check_out_date'],
  }
).refine(
  (data) => {
    // Check-out must be after check-in for overnight
    if (data.booking_type === 'overnight' && data.check_out_date) {
      const checkIn = new Date(data.booking_date);
      const checkOut = new Date(data.check_out_date);
      return checkOut > checkIn;
    }
    return true;
  },
  {
    message: 'Check-out date must be after check-in date',
    path: ['check_out_date'],
  }
).refine(
  (data) => {
    // Booking date cannot be in the past
    const bookingDate = new Date(data.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today;
  },
  {
    message: 'Booking date cannot be in the past',
    path: ['booking_date'],
  }
).refine(
  (data) => {
    // Max stay validation (30 nights)
    if (data.booking_type === 'overnight' && data.check_out_date) {
      const checkIn = new Date(data.booking_date);
      const checkOut = new Date(data.check_out_date);
      const stayDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return stayDays <= 30;
    }
    return true;
  },
  {
    message: 'Maximum stay is 30 nights',
    path: ['check_out_date'],
  }
);

type BookingPayload = z.infer<typeof BookingPayloadSchema>;

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
  let body: BookingPayload;

  try {
    const rawBody = await request.json();
    body = BookingPayloadSchema.parse(rawBody);
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
    const authenticatedUser = getCurrentUser(request);
    let userId = authenticatedUser?.id || null;

    if (!userId) {
      // Not authenticated, search for existing guest by email or create shadow account
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
    const itemsForEmail = items.map((item) => {
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
