import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getCurrentUser } from '@/lib/authMiddleware';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';
import { ErrorResponses, handleUnexpectedError } from '@/lib/apiErrors';

/**
 * Zod schema for profile update
 */
const ProfileUpdateSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').optional(),
    lastName: z.string().trim().min(1, 'Last name is required').optional(),
    phone: z.string().trim().min(7, 'Valid phone number is required').optional().nullable(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
}).refine(data => {
    // If newPassword is provided, currentPassword is required
    if (data.newPassword && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: 'Current password is required to set a new password',
    path: ['currentPassword'],
});

export async function PATCH(request: NextRequest) {
    const user = getCurrentUser(request);

    if (!user) {
        return ErrorResponses.unauthorized();
    }

    try {
        const rawBody = await request.json();
        const body = ProfileUpdateSchema.parse(rawBody);
        const { firstName, lastName, phone, currentPassword, newPassword } = body;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Get current user data for comparison and validation
            const currentRes = await client.query(
                'SELECT id, email, first_name, last_name, phone, password FROM users WHERE id = $1',
                [user.id]
            );

            if (currentRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return ErrorResponses.notFound('User not found');
            }

            const currentUser = currentRes.rows[0];
            const beforeSnapshot = {
                firstName: currentUser.first_name,
                lastName: currentUser.last_name,
                phone: currentUser.phone,
            };

            // 2. Password validation if requested
            let hashedNewPassword = null;
            if (newPassword) {
                const isPasswordCorrect = await verifyPassword(currentPassword!, currentUser.password);
                if (!isPasswordCorrect) {
                    await client.query('ROLLBACK');
                    return ErrorResponses.unauthorized('Incorrect current password');
                }
                hashedNewPassword = await hashPassword(newPassword);
            }

            // 3. Prepare update query
            const updates: string[] = [];
            const values: any[] = [];
            let paramIdx = 1;

            if (firstName) {
                updates.push(`first_name = $${paramIdx++}`);
                values.push(firstName);
            }
            if (lastName) {
                updates.push(`last_name = $${paramIdx++}`);
                values.push(lastName);
            }
            if (phone !== undefined) {
                updates.push(`phone = $${paramIdx++}`);
                values.push(phone);
            }
            if (hashedNewPassword) {
                updates.push(`password = $${paramIdx++}`);
                values.push(hashedNewPassword);
            }

            if (updates.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ message: 'No changes provided' }, { status: 400 });
            }

            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(user.id);

            const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIdx}
        RETURNING id, email, first_name, last_name, phone
      `;

            const result = await client.query(updateQuery, values);
            const updatedUser = result.rows[0];

            // 4. Audit Logging
            const afterSnapshot = {
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                phone: updatedUser.phone,
            };

            await logAuditWithRequest(request, {
                actorUserId: user.id,
                actorEmail: user.email,
                action: newPassword ? AuditActions.PASSWORD_CHANGE : AuditActions.PROFILE_UPDATE,
                entityType: EntityTypes.USER,
                entityId: user.id,
                metadata: createSnapshot(beforeSnapshot, afterSnapshot),
            });

            await client.query('COMMIT');

            return NextResponse.json({
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.first_name,
                    lastName: updatedUser.last_name,
                    phone: updatedUser.phone,
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return ErrorResponses.validationError('Validation failed', error.issues);
        }
        return handleUnexpectedError(error);
    }
}
