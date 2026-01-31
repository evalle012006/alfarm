import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { requirePermission, requireAnyPermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';

/**
 * Payment operations
 */
const PAYMENT_OPERATIONS = ['collect', 'void', 'refund'] as const;
type PaymentOperation = (typeof PAYMENT_OPERATIONS)[number];

/**
 * Permission mapping for payment operations
 */
const OPERATION_PERMISSIONS: Record<PaymentOperation, 'payments:collect' | 'payments:void' | 'payments:refund'> = {
  collect: 'payments:collect',
  void: 'payments:void',
  refund: 'payments:refund',
};

/**
 * Audit action mapping for payment operations
 */
const OPERATION_AUDIT_ACTIONS: Record<PaymentOperation, string> = {
  collect: AuditActions.PAYMENT_COLLECT,
  void: AuditActions.PAYMENT_VOID,
  refund: AuditActions.PAYMENT_REFUND,
};

/**
 * Schema for payment update
 */
const PaymentUpdateSchema = z.object({
  operation: z.enum(PAYMENT_OPERATIONS, {
    message: `Operation must be one of: ${PAYMENT_OPERATIONS.join(', ')}`,
  }),
  amount: z.number().positive().optional(),
  notes: z.string().optional(),
});

/**
 * PATCH /api/admin/bookings/[id]/payment
 * 
 * Update payment status for a booking.
 * Permission depends on operation:
 * - collect -> payments:collect
 * - void -> payments:void
 * - refund -> payments:refund
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId)) {
      return ErrorResponses.validationError('Invalid booking ID');
    }

    // Parse body first to determine required permission
    const body = await request.json();
    
    const parseResult = PaymentUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return ErrorResponses.validationError('Invalid payment data', parseResult.error.flatten());
    }

    const { operation, amount, notes } = parseResult.data;

    // RBAC: Require permission based on operation
    const requiredPermission = OPERATION_PERMISSIONS[operation];
    const check = await requirePermission(request, requiredPermission);
    if (!check.authorized) return check.response;

    // Get current booking state
    const existingResult = await pool.query(
      `SELECT id, status, payment_status, total_amount, guest_first_name, guest_last_name, notes
       FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (existingResult.rows.length === 0) {
      return ErrorResponses.notFound('Booking not found');
    }

    const booking = existingResult.rows[0];

    // Validate operation based on current state
    let newPaymentStatus: string;

    switch (operation) {
      case 'collect':
        if (booking.payment_status === 'paid') {
          return ErrorResponses.validationError('Payment has already been collected in full');
        }
        if (booking.payment_status === 'voided') {
          return ErrorResponses.validationError('Cannot collect payment on a voided booking');
        }
        // If amount provided and less than total, mark as partial
        if (amount && amount < parseFloat(booking.total_amount)) {
          newPaymentStatus = 'partial';
        } else {
          newPaymentStatus = 'paid';
        }
        break;

      case 'void':
        if (booking.payment_status === 'voided') {
          return ErrorResponses.validationError('Payment has already been voided');
        }
        if (booking.payment_status === 'refunded') {
          return ErrorResponses.validationError('Cannot void a refunded payment');
        }
        newPaymentStatus = 'voided';
        break;

      case 'refund':
        if (booking.payment_status === 'unpaid') {
          return ErrorResponses.validationError('Cannot refund an unpaid booking');
        }
        if (booking.payment_status === 'refunded') {
          return ErrorResponses.validationError('Payment has already been refunded');
        }
        if (booking.payment_status === 'voided') {
          return ErrorResponses.validationError('Cannot refund a voided payment');
        }
        newPaymentStatus = 'refunded';
        break;

      default:
        return ErrorResponses.validationError('Invalid operation');
    }

    // Build update query
    const updateNotes = notes 
      ? (booking.notes ? `${booking.notes}\n[${new Date().toISOString()}] ${operation}: ${notes}` : `[${new Date().toISOString()}] ${operation}: ${notes}`)
      : booking.notes;

    const result = await pool.query(
      `UPDATE bookings 
       SET payment_status = $1,
           notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, payment_status, notes, updated_at`,
      [newPaymentStatus, updateNotes, bookingId]
    );

    const updatedBooking = result.rows[0];

    // Log audit
    await logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: OPERATION_AUDIT_ACTIONS[operation],
      entityType: EntityTypes.PAYMENT,
      entityId: bookingId,
      metadata: {
        ...createSnapshot(
          { paymentStatus: booking.payment_status },
          { paymentStatus: updatedBooking.payment_status }
        ),
        operation,
        amount: amount || null,
        guestName: `${booking.guest_first_name} ${booking.guest_last_name}`,
        totalAmount: parseFloat(booking.total_amount),
        notes: notes || null,
      },
    });

    return NextResponse.json({
      message: `Payment ${operation} successful`,
      booking: {
        id: updatedBooking.id,
        paymentStatus: updatedBooking.payment_status,
        updatedAt: updatedBooking.updated_at,
      },
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return handleUnexpectedError(error);
  }
}
