import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendBookingConfirmationEmail } from '@/lib/email';

// Validation helpers
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  // Allow various phone formats, minimum 7 digits
  return phone.replace(/[^0-9]/g, '').length >= 7;
}

function validateDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isDateInPast(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      guest_info, 
      booking_date,      // Check-in date (required)
      check_out_date,    // Check-out date (required for overnight)
      booking_time,      // For day tours
      booking_type,      // 'day' or 'overnight'
      items 
    } = body;

    // ============================================
    // VALIDATION PHASE
    // ============================================

    // 1. Required fields check
    if (!guest_info || !booking_date || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // 2. Guest info validation
    if (!guest_info.first_name?.trim()) {
      return NextResponse.json(
        { error: 'Guest first name is required' },
        { status: 400 }
      );
    }

    if (!guest_info.last_name?.trim()) {
      return NextResponse.json(
        { error: 'Guest last name is required' },
        { status: 400 }
      );
    }

    if (!guest_info.email?.trim() || !validateEmail(guest_info.email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!guest_info.phone?.trim() || !validatePhone(guest_info.phone)) {
      return NextResponse.json(
        { error: 'Valid phone number is required (minimum 7 digits)' },
        { status: 400 }
      );
    }

    // 3. Date validation
    if (!validateDate(booking_date)) {
      return NextResponse.json(
        { error: 'Invalid booking date format' },
        { status: 400 }
      );
    }

    if (isDateInPast(booking_date)) {
      return NextResponse.json(
        { error: 'Booking date cannot be in the past' },
        { status: 400 }
      );
    }

    const type = booking_type || 'day';

    // 4. Overnight-specific validation
    if (type === 'overnight') {
      if (!check_out_date) {
        return NextResponse.json(
          { error: 'Check-out date is required for overnight bookings' },
          { status: 400 }
        );
      }

      if (!validateDate(check_out_date)) {
        return NextResponse.json(
          { error: 'Invalid check-out date format' },
          { status: 400 }
        );
      }

      const checkIn = new Date(booking_date);
      const checkOut = new Date(check_out_date);
      
      if (checkOut <= checkIn) {
        return NextResponse.json(
          { error: 'Check-out date must be after check-in date' },
          { status: 400 }
        );
      }

      // Max stay validation (e.g., 30 days)
      const maxStayDays = 30;
      const stayDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      if (stayDays > maxStayDays) {
        return NextResponse.json(
          { error: `Maximum stay is ${maxStayDays} nights` },
          { status: 400 }
        );
      }
    }

    // 5. Items validation
    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== 'number') {
        return NextResponse.json(
          { error: 'Invalid product ID in booking items' },
          { status: 400 }
        );
      }

      if (!item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity)) {
        return NextResponse.json(
          { error: 'Quantity must be a positive integer' },
          { status: 400 }
        );
      }

      if (item.quantity > 100) {
        return NextResponse.json(
          { error: 'Maximum quantity per item is 100' },
          { status: 400 }
        );
      }
    }

    // ============================================
    // DATABASE TRANSACTION
    // ============================================
    await client.query('BEGIN');

    // 1. Validate products exist and check capacity
    for (const item of items) {
      const productCheck = await client.query(
        `SELECT id, name, capacity, inventory_count, is_active, pricing_unit 
         FROM products WHERE id = $1`,
        [item.product_id]
      );

      if (productCheck.rows.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      const product = productCheck.rows[0];

      if (!product.is_active) {
        throw new Error(`Product "${product.name}" is currently unavailable`);
      }

      // Capacity check for per_head items (entrance fees, tours)
      if (product.pricing_unit === 'per_head' && product.capacity > 0) {
        // For per_head items, quantity represents number of people
        // This is informational - we don't block based on capacity for entrance fees
      }
    }

    // 2. Verify availability (inventory check with overlap detection)
    for (const item of items) {
      const availQuery = type === 'overnight' && check_out_date
        ? `
          SELECT 
            p.name,
            p.inventory_count,
            COALESCE(SUM(bi.quantity), 0)::int as booked
          FROM products p
          LEFT JOIN booking_items bi ON bi.product_id = p.id
          LEFT JOIN bookings b ON bi.booking_id = b.id 
            AND b.status NOT IN ('cancelled', 'completed')
            AND b.booking_date < $3::date
            AND COALESCE(b.check_out_date, b.booking_date + INTERVAL '1 day') > $2::date
          WHERE p.id = $1
          GROUP BY p.id, p.name, p.inventory_count
        `
        : `
          SELECT 
            p.name,
            p.inventory_count,
            COALESCE(SUM(bi.quantity), 0)::int as booked
          FROM products p
          LEFT JOIN booking_items bi ON bi.product_id = p.id
          LEFT JOIN bookings b ON bi.booking_id = b.id 
            AND b.status NOT IN ('cancelled', 'completed')
            AND (
              (b.booking_type = 'day' AND b.booking_date = $2::date)
              OR (b.booking_type = 'overnight' AND b.booking_date <= $2::date AND b.check_out_date > $2::date)
            )
          WHERE p.id = $1
          GROUP BY p.id, p.name, p.inventory_count
        `;

      const availParams = type === 'overnight' && check_out_date
        ? [item.product_id, booking_date, check_out_date]
        : [item.product_id, booking_date];

      const availRes = await client.query(availQuery, availParams);
      
      if (availRes.rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const { name, inventory_count, booked } = availRes.rows[0];
      const remaining = inventory_count - booked;

      if (remaining < item.quantity) {
        throw new Error(
          `"${name}" is not available in the requested quantity. ` +
          `Available: ${remaining}, Requested: ${item.quantity}`
        );
      }
    }

    // 2. Create User (Shadow Account) or Update Existing
    let userId = null;
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

    // 3. Calculate number of nights for pricing (overnight only)
    let numNights = 1;
    if (type === 'overnight' && check_out_date) {
      const checkIn = new Date(booking_date);
      const checkOut = new Date(check_out_date);
      numNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 4. Create Booking Header
    const bookingRes = await client.query(
      `INSERT INTO bookings (
        user_id, 
        guest_first_name, guest_last_name, guest_email, guest_phone,
        booking_date, check_out_date, booking_time, booking_type,
        status, total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 0)
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
        type
      ]
    );
    const bookingId = bookingRes.rows[0].id;

    // 5. Insert Items with proper pricing
    let totalAmount = 0;
    for (const item of items) {
      const productRes = await client.query(
        'SELECT price, pricing_unit FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productRes.rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const price = parseFloat(productRes.rows[0].price);
      const pricingUnit = productRes.rows[0].pricing_unit;
      
      // Calculate subtotal based on pricing unit
      let subtotal: number;
      if (pricingUnit === 'per_night' && type === 'overnight') {
        // Multiply by number of nights for per_night items
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

    // 6. Update Total Amount
    await client.query(
      'UPDATE bookings SET total_amount = $1 WHERE id = $2',
      [totalAmount, bookingId]
    );

    await client.query('COMMIT');

    // 7. Send confirmation email (non-blocking)
    // Fetch product names for email
    const itemsForEmail = await Promise.all(
      items.map(async (item: { product_id: number; quantity: number }) => {
        const productRes = await pool.query(
          'SELECT name, price, pricing_unit FROM products WHERE id = $1',
          [item.product_id]
        );
        const product = productRes.rows[0];
        const price = parseFloat(product.price);
        const isPerNight = product.pricing_unit === 'per_night' && type === 'overnight';
        const subtotal = price * item.quantity * (isPerNight ? numNights : 1);
        return {
          name: product.name,
          quantity: item.quantity,
          subtotal,
        };
      })
    );

    // Send email asynchronously (don't wait for it)
    sendBookingConfirmationEmail({
      booking_id: bookingId,
      guest_name: `${guest_info.first_name} ${guest_info.last_name}`,
      guest_email: guest_info.email,
      booking_date,
      check_out_date: check_out_date || null,
      booking_type: type as 'day' | 'overnight',
      total_amount: totalAmount,
      items: itemsForEmail,
      status: 'pending',
    }).catch((err) => console.error('Email send failed:', err));

    return NextResponse.json({
      booking_id: bookingId,
      message: 'Booking created successfully',
      booking_type: type,
      check_in: booking_date,
      check_out: check_out_date || null,
      nights: type === 'overnight' ? numNights : null,
      total_amount: totalAmount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Booking creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
