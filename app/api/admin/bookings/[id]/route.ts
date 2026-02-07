import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError } from '@/lib/apiErrors';

// GET - Get single booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // RBAC: Require bookings:read permission
  const check = await requirePermission(request, 'bookings:read');
  if (!check.authorized) return check.response;

  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT 
        b.*,
        u.email as user_email,
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
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN booking_items bi ON b.id = bi.booking_id
      LEFT JOIN products p ON bi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE b.id = $1
      GROUP BY b.id, u.email`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = result.rows[0];

    return NextResponse.json({
      ...booking,
      total_amount: parseFloat(booking.total_amount),
      items: (booking.items || []).map((item: any) => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
      })),
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PATCH - Update booking status/details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // RBAC: Require bookings:update permission
  const check = await requirePermission(request, 'bookings:update');
  if (!check.authorized) return check.response;

  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      status,
      payment_status,
      payment_method,
      special_requests,
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone,
      booking_date,
      check_out_date,
      booking_type,
      notes,
    } = body;

    // Validate status values
    const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled'];
    const validPaymentStatuses = ['unpaid', 'partial', 'paid', 'voided', 'refunded'];
    const validPaymentMethods = ['cash', 'gcash', 'paymaya'];
    const validBookingTypes = ['day', 'overnight'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return NextResponse.json(
        { error: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (payment_method && !validPaymentMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}` },
        { status: 400 }
      );
    }

    if (booking_type && !validBookingTypes.includes(booking_type)) {
      return NextResponse.json(
        { error: `Invalid booking type. Must be one of: ${validBookingTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check booking exists
    const existingBooking = await pool.query(
      'SELECT id, status FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (existingBooking.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (payment_status !== undefined) {
      updates.push(`payment_status = $${paramIndex}`);
      values.push(payment_status);
      paramIndex++;
    }

    if (special_requests !== undefined) {
      updates.push(`special_requests = $${paramIndex}`);
      values.push(special_requests);
      paramIndex++;
    }

    if (payment_method !== undefined) {
      updates.push(`payment_method = $${paramIndex}`);
      values.push(payment_method);
      paramIndex++;
    }

    if (guest_first_name !== undefined) {
      updates.push(`guest_first_name = $${paramIndex}`);
      values.push(guest_first_name);
      paramIndex++;
    }

    if (guest_last_name !== undefined) {
      updates.push(`guest_last_name = $${paramIndex}`);
      values.push(guest_last_name);
      paramIndex++;
    }

    if (guest_email !== undefined) {
      updates.push(`guest_email = $${paramIndex}`);
      values.push(guest_email);
      paramIndex++;
    }

    if (guest_phone !== undefined) {
      updates.push(`guest_phone = $${paramIndex}`);
      values.push(guest_phone);
      paramIndex++;
    }

    if (booking_date !== undefined) {
      updates.push(`booking_date = $${paramIndex}`);
      values.push(booking_date);
      paramIndex++;
    }

    if (check_out_date !== undefined) {
      updates.push(`check_out_date = $${paramIndex}`);
      values.push(check_out_date || null);
      paramIndex++;
    }

    if (booking_type !== undefined) {
      updates.push(`booking_type = $${paramIndex}`);
      values.push(booking_type);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(bookingId);

    const updateQuery = `
      UPDATE bookings 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    return NextResponse.json({
      message: 'Booking updated successfully',
      booking: {
        ...result.rows[0],
        total_amount: parseFloat(result.rows[0].total_amount),
      },
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // RBAC: Require bookings:cancel permission
  const check = await requirePermission(request, 'bookings:cancel');
  if (!check.authorized) return check.response;

  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    // Soft delete - just mark as cancelled
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, status`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking_id: bookingId,
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
