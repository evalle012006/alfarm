import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';

// GET - Get single booking details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // RBAC: Require bookings:read permission
  const check = await requirePermission(request, 'bookings:read');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
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
      return ErrorResponses.notFound('Booking not found');
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
    return handleUnexpectedError(error);
  }
}

// PATCH - Update booking status/details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // RBAC: Require bookings:update permission
  const check = await requirePermission(request, 'bookings:update');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
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
    const validPaymentMethods = ['paymongo'];
    const validBookingTypes = ['day', 'overnight'];

    if (status && !validStatuses.includes(status)) {
      return ErrorResponses.validationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return ErrorResponses.validationError(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`);
    }

    if (payment_method && !validPaymentMethods.includes(payment_method)) {
      return ErrorResponses.validationError(`Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`);
    }

    if (booking_type && !validBookingTypes.includes(booking_type)) {
      return ErrorResponses.validationError(`Invalid booking type. Must be one of: ${validBookingTypes.join(', ')}`);
    }

    // Check booking exists and capture current state for audit
    const existingBooking = await pool.query(
      `SELECT id, status, payment_status, payment_method, booking_type,
              booking_date, check_out_date, guest_first_name, guest_last_name,
              guest_email, guest_phone, special_requests, notes
       FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (existingBooking.rows.length === 0) {
      return ErrorResponses.notFound('Booking not found');
    }

    // Validate status transition if status is being changed
    if (status) {
      const currentStatus = existingBooking.rows[0].status;
      const allowedTransitions: Record<string, string[]> = {
        pending:     ['confirmed', 'cancelled'],
        confirmed:   ['checked_in', 'cancelled'],
        checked_in:  ['checked_out', 'cancelled'],
        checked_out: ['completed', 'cancelled'],
        completed:   [],          // terminal state
        cancelled:   ['pending'], // allow reactivation only to pending
      };

      const allowed = allowedTransitions[currentStatus] || [];
      if (status !== currentStatus && !allowed.includes(status)) {
        return ErrorResponses.validationError(
          `Cannot transition from '${currentStatus}' to '${status}'. Allowed transitions: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}`
        );
      }
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
      return ErrorResponses.validationError('No valid fields to update');
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
    const updatedBooking = result.rows[0];
    const beforeBooking = existingBooking.rows[0];

    // Build before/after snapshot from only the changed fields
    const changedFields: Record<string, unknown> = {};
    const beforeFields: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      status: 'status', payment_status: 'payment_status', payment_method: 'payment_method',
      guest_first_name: 'guest_first_name', guest_last_name: 'guest_last_name',
      guest_email: 'guest_email', guest_phone: 'guest_phone',
      booking_date: 'booking_date', check_out_date: 'check_out_date',
      booking_type: 'booking_type', special_requests: 'special_requests', notes: 'notes',
    };
    for (const [bodyKey, dbKey] of Object.entries(fieldMap)) {
      if (body[bodyKey] !== undefined) {
        beforeFields[dbKey] = beforeBooking[dbKey];
        changedFields[dbKey] = updatedBooking[dbKey];
      }
    }

    // Audit log (fire-and-forget)
    logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.BOOKING_UPDATE,
      entityType: EntityTypes.BOOKING,
      entityId: bookingId,
      metadata: {
        ...createSnapshot(beforeFields, changedFields),
        guestName: `${updatedBooking.guest_first_name} ${updatedBooking.guest_last_name}`,
      },
    }).catch((err) => console.error('Audit log failed:', err));

    return NextResponse.json({
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
        total_amount: parseFloat(updatedBooking.total_amount),
      },
    });

  } catch (error) {
    return handleUnexpectedError(error);
  }
}

// DELETE - Cancel/delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // RBAC: Require bookings:cancel permission
  const check = await requirePermission(request, 'bookings:cancel');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
    }

    // Get current status for audit snapshot
    const existingBooking = await pool.query(
      'SELECT id, status, guest_first_name, guest_last_name FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (existingBooking.rows.length === 0) {
      return ErrorResponses.notFound('Booking not found');
    }

    const previousStatus = existingBooking.rows[0].status;

    // Soft delete - just mark as cancelled
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, status`,
      [bookingId]
    );

    // Audit log (fire-and-forget)
    logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.BOOKING_CANCEL,
      entityType: EntityTypes.BOOKING,
      entityId: bookingId,
      metadata: {
        ...createSnapshot(
          { status: previousStatus },
          { status: 'cancelled' }
        ),
        guestName: `${existingBooking.rows[0].guest_first_name} ${existingBooking.rows[0].guest_last_name}`,
        cancelledBy: 'admin',
      },
    }).catch((err) => console.error('Audit log failed:', err));

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking_id: bookingId,
    });

  } catch (error) {
    return handleUnexpectedError(error);
  }
}
