import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserFromRequest } from '@/lib/rbac';
import { getPermissionsForResponse } from '@/lib/permissions';
import { ErrorResponses, handleUnexpectedError } from '@/lib/apiErrors';

/**
 * GET /api/admin/me
 * 
 * Returns the current admin user's identity and computed permissions.
 * Requires valid admin cookie JWT.
 * 
 * SECURITY:
 * - Reads token from httpOnly cookie only
 * - Verifies JWT signature and expiration
 * - Fetches fresh user data from database
 * - Verifies role is in admin allowlist
 * - Returns computed permissions for UI awareness
 * 
 * Response shape:
 * {
 *   user: { email, firstName, lastName, role },
 *   permissions: ["bookings:read", ...] | "*"
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get admin user from request (handles cookie, JWT verification, DB lookup)
    const user = await getAdminUserFromRequest(request);

    if (!user) {
      return ErrorResponses.authenticationRequired('Admin authentication required');
    }

    // Get computed permissions for this role
    const permissions = getPermissionsForResponse(user.role);

    // Return admin user data with permissions
    return NextResponse.json({
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      permissions,
    });

  } catch (error) {
    console.error('Admin me error:', error);
    return handleUnexpectedError(error);
  }
}
