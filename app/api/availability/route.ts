import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { format, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const timeSlot = searchParams.get('time_slot'); // 'day' or 'night'
    const pax = parseInt(searchParams.get('pax') || '0');

    if (!dateStr) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // 1. Get all active products
    // We also fetch their total inventory count
    const productsQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.inventory_count,
        p.category_id,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    const productsResult = await pool.query(productsQuery);
    const allProducts = productsResult.rows;

    // 2. Get Bookings for this date
    // Logic: 
    // - If checking for 'Day' (e.g. 8am-5pm): Exclude bookings that are strictly 'Night'
    // - If checking for 'Night' (e.g. 6pm-6am): Exclude bookings that are strictly 'Day'
    // - 'Any' overlaps with both.
    // For MVP simplification: We assume a booking locks the unit for the whole "slot" of that date.
    
    const bookingsQuery = `
      SELECT 
        bi.product_id, 
        SUM(bi.quantity) as booked_qty
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.id
      WHERE b.booking_date = $1
        AND b.status NOT IN ('cancelled', 'completed')
      GROUP BY bi.product_id
    `;
    
    const bookingsResult = await pool.query(bookingsQuery, [dateStr]);
    const bookedMap = new Map();
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
        total_inventory: total,
        booked_count: booked,
        remaining: remaining,
        is_available: remaining > 0
      };
    });

    return NextResponse.json({
      date: dateStr,
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
