import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { requirePermission, requireAnyPermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';
import { stripe } from '@/lib/stripe';

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id);

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
      `SELECT id, status, payment_status, payment_method, total_amount, paid_amount,
              stripe_payment_intent_id, guest_first_name, guest_last_name, notes
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

        // If this was a Stripe payment, issue refund via Stripe API
        if (booking.stripe_payment_intent_id && stripe) {
          try {
            const refund = await stripe.refunds.create({
              payment_intent: booking.stripe_payment_intent_id,
              // v1: full refund only (no amount = full refund)
            });
            // Record Stripe refund in payment_transactions
            await pool.query(
              `INSERT INTO payment_transactions (booking_id, type, amount, payment_method, stripe_payment_intent_id, stripe_refund_id, created_by, notes)
               VALUES ($1, 'refund', $2, 'stripe', $3, $4, $5, $6)`,
              [
                bookingId,
                parseFloat(booking.total_amount),
                booking.stripe_payment_intent_id,
                refund.id,
                check.user.id,
                notes || `Stripe refund issued by admin`,
              ]
            );
          } catch (stripeError: any) {
            console.error('Stripe refund failed:', stripeError);
            return ErrorResponses.validationError(
              `Stripe refund failed: ${stripeError.message || 'Unknown error'}`
            );
          }
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

    // Calculate new paid_amount
    const currentPaid = parseFloat(booking.paid_amount) || 0;
    let newPaidAmount = currentPaid;
    if (operation === 'collect') {
      newPaidAmount = currentPaid + (amount || parseFloat(booking.total_amount));
    } else if (operation === 'void') {
      newPaidAmount = 0;
    } else if (operation === 'refund') {
      newPaidAmount = 0;
    }

    const result = await pool.query(
      `UPDATE bookings 
       SET payment_status = $1,
           paid_amount = $2,
           notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, payment_status, paid_amount, notes, updated_at`,
      [newPaymentStatus, newPaidAmount, updateNotes, bookingId]
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
