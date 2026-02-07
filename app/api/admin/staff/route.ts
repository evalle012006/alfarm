import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes } from '@/lib/audit';
import { ADMIN_ROLE_ALLOWLIST } from '@/lib/roles';

/**
 * Allowed roles for staff creation
 */
const STAFF_ROLES = ['super_admin', 'cashier', 'admin', 'root'] as const;

/**
 * Schema for creating a new staff user
 */
const CreateStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(STAFF_ROLES, {
    message: `Role must be one of: ${STAFF_ROLES.join(', ')}`,
  }),
  phone: z.string().optional(),
});

/**
 * GET /api/admin/staff
 * 
 * List all staff users (non-guest roles).
 * Permission: staff:read
 */
export async function GET(request: NextRequest) {
  // RBAC: Require staff:read permission
  const check = await requirePermission(request, 'staff:read');
  if (!check.authorized) return check.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE role != 'guest'
    `;

    if (!includeInactive) {
      query += ` AND is_active = true`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query);

    return NextResponse.json({
      staff: result.rows.map(row => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });

  } catch (error) {
    console.error('Error fetching staff:', error);
    return handleUnexpectedError(error);
  }
}

/**
 * POST /api/admin/staff
 * 
 * Create a new staff user.
 * Permission: staff:manage
 */
export async function POST(request: NextRequest) {
  // RBAC: Require staff:manage permission
  const check = await requirePermission(request, 'staff:manage');
  if (!check.authorized) return check.response;

  try {
    const body = await request.json();

    // Validate request body
    const parseResult = CreateStaffSchema.safeParse(body);
    if (!parseResult.success) {
      return ErrorResponses.validationError('Invalid staff data', parseResult.error.flatten());
    }

    const { email, password, firstName, lastName, role, phone } = parseResult.data;

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return ErrorResponses.conflict('A user with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create staff user
    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
      [email.toLowerCase(), hashedPassword, firstName, lastName, phone || null, role]
    );

    const newStaff = result.rows[0];

    // Log audit
    await logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.STAFF_CREATE,
      entityType: EntityTypes.USER,
      entityId: newStaff.id,
      metadata: {
        after: {
          email: newStaff.email,
          firstName: newStaff.first_name,
          lastName: newStaff.last_name,
          role: newStaff.role,
        },
      },
    });

    return NextResponse.json({
      message: 'Staff user created successfully',
      staff: {
        id: newStaff.id,
        email: newStaff.email,
        firstName: newStaff.first_name,
        lastName: newStaff.last_name,
        phone: newStaff.phone,
        role: newStaff.role,
        isActive: newStaff.is_active,
        createdAt: newStaff.created_at,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating staff:', error);
    return handleUnexpectedError(error);
  }
}
