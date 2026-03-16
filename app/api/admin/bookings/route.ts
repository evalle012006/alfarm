import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { sanitizeSearch } from '@/lib/sanitize';
import { parsePagination, buildPaginationResponse } from '@/lib/pagination';
import { logAuditWithRequest, AuditActions, EntityTypes } from '@/lib/audit';

// GET - List all bookings (admin only)
export async function GET(request: NextRequest) {
  // RBAC: Require bookings:read permission
  const check = await requirePermission(request, 'bookings:read');
  if (!check.authorized) return check.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const search = sanitizeSearch(searchParams.get('search'));
    const { limit, offset } = parsePagination({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      page: searchParams.get('page'),
      per_page: searchParams.get('per_page'),
    });

    let query = `
      SELECT 
        b.id,
        b.user_id,
        b.booking_date,
        b.check_out_date,
        b.booking_type,
        b.booking_time,
        b.status,
        b.payment_status,
        b.total_amount,
        b.guest_first_name,
        b.guest_last_name,
        b.guest_email,
        b.guest_phone,
        b.special_requests,
        b.qr_code_hash,
        b.created_at,
        b.updated_at,
        json_agg(
          json_build_object(
            'id', bi.id,
            'product_id', bi.product_id,
            'product_name', p.name,
            'category', c.name,
            'quantity', bi.quantity,
            'unit_price', bi.unit_price,
            'subtotal', bi.subtotal
          )
        ) FILTER (WHERE bi.id IS NOT NULL) as items
      FROM bookings b
      LEFT JOIN booking_items bi ON b.id = bi.booking_id
      LEFT JOIN products p ON bi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (date) {
      query += ` AND b.booking_date = $${paramIndex}::date`;
      params.push(date);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        b.guest_first_name ILIKE $${paramIndex} OR 
        b.guest_last_name ILIKE $${paramIndex} OR 
        b.guest_email ILIKE $${paramIndex} OR
        b.guest_phone ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM bookings WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (date) {
      countQuery += ` AND booking_date = $${countParamIndex}::date`;
      countParams.push(date);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (
        guest_first_name ILIKE $${countParamIndex} OR 
        guest_last_name ILIKE $${countParamIndex} OR 
        guest_email ILIKE $${countParamIndex} OR
        guest_phone ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    const bookings = result.rows.map(booking => ({
      ...booking,
      total_amount: parseFloat(booking.total_amount),
      items: (booking.items || []).map((item: any) => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
      })),
    }));

    return NextResponse.json({
      bookings,
      pagination: buildPaginationResponse(totalCount, limit, offset),
    });

  } catch (error) {
    return handleUnexpectedError(error);
  }
}

// POST - Create booking (admin can create on behalf of guests)
export async function POST(request: NextRequest) {
  // RBAC: Require bookings:create permission
  const check = await requirePermission(request, 'bookings:create');
  if (!check.authorized) return check.response;

  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      guest_info,
      booking_date,
      check_out_date,
      booking_time,
      booking_type,
      items,
      status: initialStatus,
      payment_status,
      special_requests,
    } = body;

    // Basic validation
    if (!guest_info || !guest_info.first_name || !guest_info.last_name || !guest_info.email || !guest_info.phone) {
      return ErrorResponses.validationError('Missing required guest information');
    }
    if (!booking_date || !items || items.length === 0) {
      return ErrorResponses.validationError('Missing required booking information (date and items)');
    }

    const type = booking_type || 'day';

    if (type === 'overnight' && !check_out_date) {
      return ErrorResponses.validationError('Check-out date is required for overnight bookings');
    }

    await client.query('BEGIN');

    // ============================================
    // STEP 1: LOCK PRODUCTS AND VALIDATE INVENTORY
    // FOR UPDATE prevents concurrent overselling
    // ============================================
    const lockedProducts = new Map<number, any>();

    for (const item of items) {
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
    // ============================================
    for (const item of items) {
      const product = lockedProducts.get(item.product_id)!;

      const availQuery = type === 'overnight' && check_out_date
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

      const availParams = type === 'overnight' && check_out_date
        ? [item.product_id, booking_date, check_out_date]
        : [item.product_id, booking_date];

      const availRes = await client.query(availQuery, availParams);
      const booked = availRes.rows[0]?.booked || 0;
      const remaining = product.inventory_count - booked;

      if (remaining < item.quantity) {
        await client.query('ROLLBACK');
        return ErrorResponses.insufficientInventory(
          `"${product.name}" is not available in the requested quantity. ` +
          `Available: ${remaining}, Requested: ${item.quantity}`
        );
      }
    }

    // ============================================
    // STEP 3: FIND OR CREATE USER
    // ============================================
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

    // ============================================
    // STEP 4: CALCULATE NIGHTS
    // ============================================
    let numNights = 1;
    if (type === 'overnight' && check_out_date) {
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
        status, payment_status, special_requests, qr_code_hash, total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0)
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
        type,
        initialStatus || 'confirmed', // Admin bookings default to confirmed
        payment_status || 'unpaid',
        special_requests || null,
        qrCodeHash,
      ]
    );
    const bookingId = bookingRes.rows[0].id;

    // ============================================
    // STEP 6: INSERT BOOKING ITEMS (using locked product data)
    // ============================================
    let totalAmount = 0;
    for (const item of items) {
      const product = lockedProducts.get(item.product_id)!;
      const price = parseFloat(product.price);
      const pricingUnit = product.pricing_unit;

      let subtotal: number;
      if (pricingUnit === 'per_night' && type === 'overnight') {
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
    // STEP 8: AUDIT LOG
    // ============================================
    logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.BOOKING_CREATE,
      entityType: EntityTypes.BOOKING,
      entityId: bookingId,
      metadata: {
        bookingType: type,
        bookingDate: booking_date,
        checkOutDate: check_out_date || null,
        guestName: `${guest_info.first_name} ${guest_info.last_name}`,
        guestEmail: guest_info.email,
        totalAmount,
        itemCount: items.length,
        status: initialStatus || 'confirmed',
      },
    }).catch((err) => console.error('Audit log failed:', err));

    return NextResponse.json({
      booking_id: bookingId,
      message: 'Booking created successfully',
      total_amount: totalAmount,
      qr_code_hash: qrCodeHash,
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin booking creation error:', error);
    return handleUnexpectedError(error);
  } finally {
    client.release();
  }
}
