import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';

const UpdateGuestSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
});

/**
 * GET /api/admin/guests/[id]
 * 
 * Get a single guest with booking stats.
 * Permission: staff:read
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'staff:read');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const guestId = parseInt(id);
    if (isNaN(guestId)) {
      return ErrorResponses.validationError('Invalid guest ID');
    }

    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, u.role,
        u.is_active, u.created_at,
        COALESCE(u.is_shadow, FALSE) as is_shadow,
        COUNT(b.id)::int as total_bookings,
        MAX(b.booking_date) as last_booking_date,
        COALESCE(SUM(b.total_amount), 0)::float as total_spent
       FROM users u
       LEFT JOIN bookings b ON u.id = b.user_id
       WHERE u.id = $1 AND u.role = 'guest'
       GROUP BY u.id`,
      [guestId]
    );

    if (result.rows.length === 0) {
      return ErrorResponses.notFound('Guest not found');
    }

    const row = result.rows[0];
    return NextResponse.json({
      guest: {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        isActive: row.is_active,
        isShadow: row.is_shadow,
        createdAt: row.created_at,
        totalBookings: row.total_bookings,
        lastBookingDate: row.last_booking_date,
        totalSpent: row.total_spent,
      },
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}

/**
 * PATCH /api/admin/guests/[id]
 * 
 * Update guest contact info.
 * Permission: staff:manage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'staff:manage');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const guestId = parseInt(id);
    if (isNaN(guestId)) {
      return ErrorResponses.validationError('Invalid guest ID');
    }

    const body = await request.json();
    const parseResult = UpdateGuestSchema.safeParse(body);
    if (!parseResult.success) {
      return ErrorResponses.validationError('Invalid guest data', parseResult.error.flatten());
    }

    const { firstName, lastName, email, phone } = parseResult.data;

    // Verify guest exists
    const existing = await pool.query(
      'SELECT id, email FROM users WHERE id = $1 AND role = $2',
      [guestId, 'guest']
    );
    if (existing.rows.length === 0) {
      return ErrorResponses.notFound('Guest not found');
    }

    // If email is being changed, check for duplicates
    if (email && email.toLowerCase() !== existing.rows[0].email.toLowerCase()) {
      const dup = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
        [email, guestId]
      );
      if (dup.rows.length > 0) {
        return ErrorResponses.conflict('A user with this email already exists');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(firstName);
      paramIndex++;
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(lastName);
      paramIndex++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email.toLowerCase());
      paramIndex++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (updates.length === 0) {
      return ErrorResponses.validationError('No valid fields to update');
    }

    values.push(guestId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, first_name, last_name, phone`,
      values
    );

    const updated = result.rows[0];
    return NextResponse.json({
      message: 'Guest updated successfully',
      guest: {
        id: updated.id,
        email: updated.email,
        firstName: updated.first_name,
        lastName: updated.last_name,
        phone: updated.phone,
      },
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
