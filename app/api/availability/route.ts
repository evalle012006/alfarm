import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { ErrorResponses, handleUnexpectedError } from '@/lib/apiErrors';

/**
 * Zod schema for availability query parameters
 */
const AvailabilityQuerySchema = z.object({
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  type: z.enum(['day', 'overnight']).default('day'),
  time_slot: z.enum(['day', 'night', 'any']).optional(),
}).refine(
  (data) => {
    // Overnight bookings must have check_out
    if (data.type === 'overnight') {
      return !!data.check_out;
    }
    return true;
  },
  {
    message: 'check_out parameter is required for overnight bookings',
    path: ['check_out'],
  }
).refine(
  (data) => {
    // Check-out must be after check-in
    if (data.check_out) {
      return new Date(data.check_out) > new Date(data.check_in);
    }
    return true;
  },
  {
    message: 'check_out must be after check_in',
    path: ['check_out'],
  }
);

/**
 * GET /api/availability
 * Check real-time product availability for date range
 * 
 * FEATURES:
 * - Rate limiting prevents abuse
 * - Zod validation for query parameters
 * - Standardized error responses
 * - NO LOGIC CHANGES to existing date overlap calculation
 */
export async function GET(request: NextRequest) {
  // ============================================
  // RATE LIMITING
  // ============================================
  const rateLimitResponse = checkRateLimit(
    request,
    RateLimitPresets.availability.limit,
    RateLimitPresets.availability.windowMs
  );
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // ============================================
  // INPUT VALIDATION (Zod)
  // ============================================
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = {
    check_in: searchParams.get('check_in') || searchParams.get('date'),
    check_out: searchParams.get('check_out') || undefined,
    type: searchParams.get('type') || 'day',
    time_slot: searchParams.get('time_slot') || undefined,
  };

  let query: z.infer<typeof AvailabilityQuerySchema>;
  
  try {
    query = AvailabilityQuerySchema.parse(rawQuery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.validationError(
        'Invalid query parameters',
        error.issues
      );
    }
    return ErrorResponses.validationError('Invalid request parameters');
  }

  const { check_in: checkInStr, check_out: checkOutStr, type: bookingType, time_slot: timeSlot } = query;

  try {

    // ============================================
    // STEP 1: GET ACTIVE PRODUCTS
    // ============================================
    let productsQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.inventory_count,
        p.category_id,
        p.pricing_unit,
        p.time_slot,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    
    const productParams: any[] = [];
    if (timeSlot) {
      productsQuery += ` AND (p.time_slot = $1 OR p.time_slot = 'any')`;
      productParams.push(timeSlot);
    }

    const productsResult = await pool.query(productsQuery, productParams);
    const allProducts = productsResult.rows;

    // ============================================
    // STEP 2: GET OVERLAPPING BOOKINGS
    // NO LOGIC CHANGES - preserving existing date overlap calculation
    // ============================================
    let bookingsQuery: string;
    let bookingParams: any[];

    if (bookingType === 'overnight' && checkOutStr) {
      // Overnight: Check for overlapping date ranges
      // A booking overlaps if: booking_date < requested_check_out AND (check_out_date OR booking_date) > requested_check_in
      bookingsQuery = `
        SELECT 
          bi.product_id, 
          SUM(bi.quantity) as booked_qty
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        WHERE b.status NOT IN ('cancelled', 'completed')
          AND (
            -- Overlap check: existing booking overlaps with requested range
            b.booking_date < $2::date
            AND COALESCE(b.check_out_date, b.booking_date + INTERVAL '1 day') > $1::date
          )
        GROUP BY bi.product_id
      `;
      bookingParams = [checkInStr, checkOutStr];
    } else {
      // Day-use: Check single date
      bookingsQuery = `
        SELECT 
          bi.product_id, 
          SUM(bi.quantity) as booked_qty
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        WHERE b.status NOT IN ('cancelled', 'completed')
          AND (
            -- Day booking on this date
            (b.booking_type = 'day' AND b.booking_date = $1::date)
            OR
            -- Overnight booking that spans this date
            (b.booking_type = 'overnight' AND b.booking_date <= $1::date AND b.check_out_date > $1::date)
          )
        GROUP BY bi.product_id
      `;
      bookingParams = [checkInStr];
    }
    
    const bookingsResult = await pool.query(bookingsQuery, bookingParams);
    const bookedMap = new Map<number, number>();
    bookingsResult.rows.forEach(row => {
      bookedMap.set(row.product_id, parseInt(row.booked_qty));
    });

    // ============================================
    // STEP 3: CALCULATE AVAILABILITY
    // ============================================
    const availability = allProducts.map(product => {
      const total = product.inventory_count;
      const booked = bookedMap.get(product.id) || 0;
      const remaining = Math.max(0, total - booked);

      return {
        id: product.id,
        name: product.name,
        category: product.category_name,
        pricing_unit: product.pricing_unit,
        time_slot: product.time_slot,
        total_inventory: total,
        booked_count: booked,
        remaining: remaining,
        is_available: remaining > 0
      };
    });

    return NextResponse.json({
      check_in: checkInStr,
      check_out: checkOutStr || null,
      booking_type: bookingType,
      availability
    });

  } catch (error) {
    return handleUnexpectedError(error);
  }
}
