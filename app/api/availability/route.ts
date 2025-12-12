import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const checkInStr = searchParams.get('check_in') || searchParams.get('date'); // YYYY-MM-DD
    const checkOutStr = searchParams.get('check_out'); // YYYY-MM-DD (optional, for overnight)
    const bookingType = searchParams.get('type') || 'day'; // 'day' or 'overnight'
    const timeSlot = searchParams.get('time_slot'); // 'day' or 'night'

    if (!checkInStr) {
      return NextResponse.json(
        { error: 'check_in (or date) parameter is required' },
        { status: 400 }
      );
    }

    // For overnight bookings, check_out is required
    if (bookingType === 'overnight' && !checkOutStr) {
      return NextResponse.json(
        { error: 'check_out parameter is required for overnight bookings' },
        { status: 400 }
      );
    }

    // 1. Get all active products, filtered by time_slot if provided
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

    // 2. Get Bookings that overlap with the requested date range
    // For day-use: check single date match
    // For overnight: check date range overlap using: (start1 < end2) AND (end1 > start2)
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

    // 3. Calculate Availability
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
    console.error('Availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
