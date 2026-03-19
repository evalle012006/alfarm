import { z } from 'zod';

/**
 * Shared Zod schemas for booking validation.
 * Used by:
 *   - POST /api/bookings
 *   - POST /api/bookings/checkout-session
 *   - POST /api/admin/bookings
 */

export const BookingItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(100),
});

export const GuestInfoSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().trim().min(7, 'Valid phone number is required (minimum 7 digits)'),
});

/**
 * Base booking refinements applied to all booking creation schemas.
 */
function applyBookingRefinements<T extends z.ZodTypeAny>(schema: T) {
  return (schema as any)
    .refine(
      (data: any) => {
        if (data.booking_type === 'overnight') return !!data.check_out_date;
        return true;
      },
      { message: 'Check-out date is required for overnight bookings', path: ['check_out_date'] }
    )
    .refine(
      (data: any) => {
        if (data.booking_type === 'overnight' && data.check_out_date) {
          return new Date(data.check_out_date) > new Date(data.booking_date);
        }
        return true;
      },
      { message: 'Check-out date must be after check-in date', path: ['check_out_date'] }
    )
    .refine(
      (data: any) => {
        const bookingDate = new Date(data.booking_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return bookingDate >= today;
      },
      { message: 'Booking date cannot be in the past', path: ['booking_date'] }
    )
    .refine(
      (data: any) => {
        if (data.booking_type === 'overnight' && data.check_out_date) {
          const days = Math.ceil(
            (new Date(data.check_out_date).getTime() - new Date(data.booking_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          return days <= 30;
        }
        return true;
      },
      { message: 'Maximum stay is 30 nights', path: ['check_out_date'] }
    );
}

// ─── Date field helpers ──────────────────────────────────────────────────────
const dateField = z.string().datetime({ message: 'Invalid date format' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));
const optionalDateField = dateField.optional().nullable();

// ─── Guest booking (POST /api/bookings) ──────────────────────────────────────
export const GuestBookingPayloadSchema = applyBookingRefinements(
  z.object({
    booking_type: z.enum(['day', 'overnight']),
    booking_date: dateField,
    check_out_date: optionalDateField,
    booking_time: z.string().optional().nullable(),
    guest_info: GuestInfoSchema,
    items: z.array(BookingItemSchema).min(1, 'At least one item is required'),
    special_requests: z.string().max(1000).optional().nullable(),
    payment_method: z.literal('paymongo').default('paymongo'),
  })
);

export type GuestBookingPayload = z.infer<typeof GuestBookingPayloadSchema>;

// ─── Checkout session (POST /api/bookings/checkout-session) ──────────────────
export const CheckoutSessionPayloadSchema = applyBookingRefinements(
  z.object({
    booking_type: z.enum(['day', 'overnight']),
    booking_date: dateField,
    check_out_date: optionalDateField,
    booking_time: z.string().optional().nullable(),
    guest_info: GuestInfoSchema,
    items: z.array(BookingItemSchema).min(1, 'At least one item is required'),
    special_requests: z.string().max(1000).optional().nullable(),
  })
);

export type CheckoutSessionPayload = z.infer<typeof CheckoutSessionPayloadSchema>;

// ─── Admin booking (POST /api/admin/bookings) ───────────────────────────────
const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled'] as const;
const validPaymentStatuses = ['unpaid', 'partial', 'paid', 'voided', 'refunded'] as const;
const validPaymentMethods = ['paymongo'] as const;

export const AdminBookingPayloadSchema = applyBookingRefinements(
  z.object({
    booking_type: z.enum(['day', 'overnight']),
    booking_date: dateField,
    check_out_date: optionalDateField,
    booking_time: z.string().optional().nullable(),
    guest_info: GuestInfoSchema,
    items: z.array(BookingItemSchema).min(1, 'At least one item is required'),
    special_requests: z.string().max(1000).optional().nullable(),
    status: z.enum(validStatuses).default('confirmed'),
    payment_status: z.enum(validPaymentStatuses).default('unpaid'),
    payment_method: z.enum(validPaymentMethods).default('paymongo'),
  })
);

export type AdminBookingPayload = z.infer<typeof AdminBookingPayloadSchema>;
