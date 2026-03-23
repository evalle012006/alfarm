import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';

const AddItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const RemoveItemSchema = z.object({
  item_id: z.number().int().positive(),
});

/**
 * POST /api/admin/bookings/[id]/items
 * 
 * Add a product to an existing booking.
 * Permission: bookings:update
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'bookings:update');
  if (!check.authorized) return check.response;

  const client = await pool.connect();

  try {
    const { id } = await params;
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
    }

    const body = await request.json();
    const parseResult = AddItemSchema.safeParse(body);
    if (!parseResult.success) {
      return ErrorResponses.validationError('Invalid item data', parseResult.error.flatten());
    }

    const { product_id, quantity } = parseResult.data;

    await client.query('BEGIN');

    // Get booking
    const bookingResult = await client.query(
      `SELECT id, status, booking_type, booking_date, check_out_date, total_amount,
              guest_first_name, guest_last_name
       FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );
    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return ErrorResponses.notFound('Booking not found');
    }
    const booking = bookingResult.rows[0];

    // Cannot modify completed or cancelled bookings
    if (['completed', 'cancelled'].includes(booking.status)) {
      await client.query('ROLLBACK');
      return ErrorResponses.validationError(`Cannot modify items on a ${booking.status} booking`);
    }

    // Lock and validate product
    const productResult = await client.query(
      `SELECT id, name, price, pricing_unit, inventory_count, is_active
       FROM products WHERE id = $1 FOR UPDATE`,
      [product_id]
    );
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return ErrorResponses.notFound('Product not found');
    }
    const product = productResult.rows[0];

    if (!product.is_active) {
      await client.query('ROLLBACK');
      return ErrorResponses.validationError(`Product "${product.name}" is currently unavailable`);
    }

    // Calculate subtotal
    const price = parseFloat(product.price);
    let numNights = 1;
    if (product.pricing_unit === 'per_night' && booking.booking_type === 'overnight' && booking.check_out_date) {
      const checkIn = new Date(booking.booking_date);
      const checkOut = new Date(booking.check_out_date);
      numNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }
    const subtotal = product.pricing_unit === 'per_night' && booking.booking_type === 'overnight'
      ? price * quantity * numNights
      : price * quantity;

    // Insert booking item
    const itemResult = await client.query(
      `INSERT INTO booking_items (booking_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, product_id, quantity, unit_price, subtotal`,
      [bookingId, product_id, quantity, price, subtotal]
    );

    // Update booking total
    const newTotal = parseFloat(booking.total_amount) + subtotal;
    await client.query(
      'UPDATE bookings SET total_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newTotal, bookingId]
    );

    await client.query('COMMIT');

    // Audit log
    logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.BOOKING_UPDATE,
      entityType: EntityTypes.BOOKING,
      entityId: bookingId,
      metadata: {
        ...createSnapshot(
          { totalAmount: parseFloat(booking.total_amount) },
          { totalAmount: newTotal }
        ),
        operation: 'add_item',
        productName: product.name,
        quantity,
        subtotal,
        guestName: `${booking.guest_first_name} ${booking.guest_last_name}`,
      },
    }).catch((err) => console.error('Audit log failed:', err));

    return NextResponse.json({
      message: 'Item added to booking',
      item: {
        ...itemResult.rows[0],
        product_name: product.name,
        unit_price: parseFloat(itemResult.rows[0].unit_price),
        subtotal: parseFloat(itemResult.rows[0].subtotal),
      },
      newTotal,
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding booking item:', error);
    return handleUnexpectedError(error);
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/admin/bookings/[id]/items
 * 
 * Remove an item from a booking.
 * Permission: bookings:update
 * Body: { item_id: number }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'bookings:update');
  if (!check.authorized) return check.response;

  const client = await pool.connect();

  try {
    const { id } = await params;
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
    }

    const body = await request.json();
    const parseResult = RemoveItemSchema.safeParse(body);
    if (!parseResult.success) {
      return ErrorResponses.validationError('Invalid request data', parseResult.error.flatten());
    }

    const { item_id } = parseResult.data;

    await client.query('BEGIN');

    // Get booking
    const bookingResult = await client.query(
      `SELECT id, status, total_amount, guest_first_name, guest_last_name
       FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );
    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return ErrorResponses.notFound('Booking not found');
    }
    const booking = bookingResult.rows[0];

    if (['completed', 'cancelled'].includes(booking.status)) {
      await client.query('ROLLBACK');
      return ErrorResponses.validationError(`Cannot modify items on a ${booking.status} booking`);
    }

    // Get the item to remove
    const itemResult = await client.query(
      `SELECT bi.id, bi.subtotal, bi.quantity, p.name as product_name
       FROM booking_items bi
       JOIN products p ON bi.product_id = p.id
       WHERE bi.id = $1 AND bi.booking_id = $2`,
      [item_id, bookingId]
    );
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return ErrorResponses.notFound('Booking item not found');
    }

    const item = itemResult.rows[0];

    // Check that booking has more than 1 item (cannot remove last item)
    const countResult = await client.query(
      'SELECT COUNT(*)::int as count FROM booking_items WHERE booking_id = $1',
      [bookingId]
    );
    if (countResult.rows[0].count <= 1) {
      await client.query('ROLLBACK');
      return ErrorResponses.validationError('Cannot remove the last item from a booking. Cancel the booking instead.');
    }

    // Remove item
    await client.query('DELETE FROM booking_items WHERE id = $1', [item_id]);

    // Update booking total
    const newTotal = parseFloat(booking.total_amount) - parseFloat(item.subtotal);
    await client.query(
      'UPDATE bookings SET total_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [Math.max(0, newTotal), bookingId]
    );

    await client.query('COMMIT');

    // Audit log
    logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.BOOKING_UPDATE,
      entityType: EntityTypes.BOOKING,
      entityId: bookingId,
      metadata: {
        ...createSnapshot(
          { totalAmount: parseFloat(booking.total_amount) },
          { totalAmount: Math.max(0, newTotal) }
        ),
        operation: 'remove_item',
        productName: item.product_name,
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
        guestName: `${booking.guest_first_name} ${booking.guest_last_name}`,
      },
    }).catch((err) => console.error('Audit log failed:', err));

    return NextResponse.json({
      message: 'Item removed from booking',
      removedItemId: item_id,
      newTotal: Math.max(0, newTotal),
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing booking item:', error);
    return handleUnexpectedError(error);
  } finally {
    client.release();
  }
}
