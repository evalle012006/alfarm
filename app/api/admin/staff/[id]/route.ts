import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';
import { isAdminRoleAllowlisted } from '@/lib/roles';

/**
 * Allowed roles for staff updates
 */
const STAFF_ROLES = ['super_admin', 'cashier', 'admin', 'root'] as const;

/**
 * Schema for updating a staff user
 */
const UpdateStaffSchema = z.object({
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
});

/**
 * GET /api/admin/staff/[id]
 * 
 * Get a single staff user by ID.
 * Permission: staff:read
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // RBAC: Require staff:read permission
  const check = await requirePermission(request, 'staff:read');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const staffId = parseInt(id);

    if (isNaN(staffId)) {
      return ErrorResponses.validationError('Invalid staff ID');
    }

    const result = await pool.query(
      `SELECT 
        id, email, first_name, last_name, phone, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1 AND role != 'guest'`,
      [staffId]
    );

    if (result.rows.length === 0) {
      return ErrorResponses.notFound('Staff user not found');
    }

    const staff = result.rows[0];

    return NextResponse.json({
      staff: {
        id: staff.id,
        email: staff.email,
        firstName: staff.first_name,
        lastName: staff.last_name,
        phone: staff.phone,
        role: staff.role,
        isActive: staff.is_active,
        createdAt: staff.created_at,
        updatedAt: staff.updated_at,
      },
    });

  } catch (error) {
    console.error('Error fetching staff:', error);
    return handleUnexpectedError(error);
  }
}

/**
 * PATCH /api/admin/staff/[id]
 * 
 * Update a staff user (role, active status, password reset).
 * Permission: staff:manage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // RBAC: Require staff:manage permission
  const check = await requirePermission(request, 'staff:manage');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const staffId = parseInt(id);

    if (isNaN(staffId)) {
      return ErrorResponses.validationError('Invalid staff ID');
    }

    const body = await request.json();

    // Validate request body
    const parseResult = UpdateStaffSchema.safeParse(body);
    if (!parseResult.success) {
      return ErrorResponses.validationError('Invalid update data', parseResult.error.flatten());
    }

    const { role, isActive, password, firstName, lastName, phone } = parseResult.data;

    // Check if staff exists and is not a guest
    const existingResult = await pool.query(
      `SELECT id, email, first_name, last_name, phone, role, is_active
       FROM users WHERE id = $1 AND role != 'guest'`,
      [staffId]
    );

    if (existingResult.rows.length === 0) {
      return ErrorResponses.notFound('Staff user not found');
    }

    const existingStaff = existingResult.rows[0];

    // Prevent self-deactivation
    if (isActive === false && staffId === check.user.id) {
      return ErrorResponses.validationError('You cannot deactivate your own account');
    }

    // Prevent changing own role
    if (role && staffId === check.user.id && role !== existingStaff.role) {
      return ErrorResponses.validationError('You cannot change your own role');
    }

    // Validate new role is in allowlist
    if (role && !isAdminRoleAllowlisted(role)) {
      return ErrorResponses.validationError(`Invalid role: ${role}`);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | boolean | number | null)[] = [];
    let paramIndex = 1;

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (password !== undefined) {
      const hashedPassword = await hashPassword(password);
      updates.push(`password = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }

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

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (updates.length === 0) {
      return ErrorResponses.validationError('No valid fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(staffId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, phone, role, is_active, updated_at
    `;

    const result = await pool.query(updateQuery, values);
    const updatedStaff = result.rows[0];

    // Determine audit action
    let auditAction: string = AuditActions.STAFF_UPDATE;
    if (role !== undefined && role !== existingStaff.role) {
      auditAction = AuditActions.STAFF_ROLE_CHANGE;
    } else if (isActive === false && existingStaff.is_active === true) {
      auditAction = AuditActions.STAFF_DISABLE;
    } else if (isActive === true && existingStaff.is_active === false) {
      auditAction = AuditActions.STAFF_ENABLE;
    } else if (password !== undefined) {
      auditAction = AuditActions.STAFF_PASSWORD_RESET;
    }

    // Log audit
    await logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: auditAction,
      entityType: EntityTypes.USER,
      entityId: staffId,
      metadata: {
        ...createSnapshot(
          {
            role: existingStaff.role,
            isActive: existingStaff.is_active,
            firstName: existingStaff.first_name,
            lastName: existingStaff.last_name,
          },
          {
            role: updatedStaff.role,
            isActive: updatedStaff.is_active,
            firstName: updatedStaff.first_name,
            lastName: updatedStaff.last_name,
          }
        ),
        passwordChanged: password !== undefined,
      },
    });

    return NextResponse.json({
      message: 'Staff user updated successfully',
      staff: {
        id: updatedStaff.id,
        email: updatedStaff.email,
        firstName: updatedStaff.first_name,
        lastName: updatedStaff.last_name,
        phone: updatedStaff.phone,
        role: updatedStaff.role,
        isActive: updatedStaff.is_active,
        updatedAt: updatedStaff.updated_at,
      },
    });

  } catch (error) {
    console.error('Error updating staff:', error);
    return handleUnexpectedError(error);
  }
}
