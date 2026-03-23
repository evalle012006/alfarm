/**
 * RBAC (Role-Based Access Control) Helpers
 * 
 * Server-side utilities for enforcing permissions on admin API routes.
 * Uses cookie-based JWT authentication for admin users.
 * 
 * SECURITY:
 * - All permission checks are server-side (API is source of truth)
 * - Unknown roles have no permissions
 * - Uses explicit allowlist from lib/roles.ts
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from './db';
import { isAdminRoleAllowlisted, type AdminRole } from './roles';
import { hasPermission, type Permission } from './permissions';
import { ErrorResponses } from './apiErrors';

/**
 * Admin cookie name - must match middleware.ts and login endpoint
 */
const ADMIN_COOKIE_NAME = 'admin_token';

/**
 * Admin user data returned from authentication
 */
export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

/**
 * Result of permission check
 */
export type PermissionCheckResult = 
  | { authorized: true; user: AdminUser }
  | { authorized: false; response: Response };

/**
 * Get JWT secret as Uint8Array for jose library
 */
function getJWTSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return new TextEncoder().encode('dev-only-insecure-secret-change-before-production');
  }
  
  return new TextEncoder().encode(secret);
}

/**
 * Verify admin JWT token and extract payload
 */
async function verifyAdminToken(token: string): Promise<{ userId: number; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecretKey());
    
    const rawId = payload.id;
    const userId = typeof rawId === 'number' ? rawId : Number(rawId);
    const email = payload.email as string;
    const role = payload.role as string;

    if (!Number.isInteger(userId) || userId <= 0) return null;
    if (!email || !role) return null;
    
    return { userId, email, role };
  } catch {
    return null;
  }
}

/**
 * Get admin user from request cookie.
 * 
 * Steps:
 * 1. Read admin_token cookie
 * 2. Verify JWT signature and expiration
 * 3. Fetch user from database by ID
 * 4. Validate user role is in admin allowlist
 * 
 * @param request - Next.js request object
 * @returns AdminUser if authenticated, null otherwise
 */
export async function getAdminUserFromRequest(request: NextRequest): Promise<AdminUser | null> {
  // Get token from cookie
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  // Verify JWT
  const payload = await verifyAdminToken(token);
  
  if (!payload) {
    return null;
  }
  
  // Fetch fresh user data from database (including is_active check)
  const result = await pool.query(
    'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
    [payload.userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const user = result.rows[0];
  
  // Reject deactivated staff — invalidates session even if JWT is still valid
  if (user.is_active === false) {
    return null;
  }
  
  // Validate role is in admin allowlist
  if (!isAdminRoleAllowlisted(user.role)) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role as AdminRole,
  };
}

/**
 * Require a specific permission for an admin API route.
 * 
 * This is the main RBAC guard for admin endpoints.
 * Call this at the start of each admin API handler.
 * 
 * @param request - Next.js request object
 * @param permission - Required permission
 * @returns Object with authorized status and either user or error response
 * 
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const check = await requirePermission(request, 'bookings:read');
 *   if (!check.authorized) return check.response;
 *   
 *   const user = check.user;
 *   // ... proceed with authorized logic
 * }
 * ```
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<PermissionCheckResult> {
  // Get admin user from request
  const user = await getAdminUserFromRequest(request);
  
  if (!user) {
    return {
      authorized: false,
      response: ErrorResponses.authenticationRequired('Admin authentication required'),
    };
  }
  
  // Check if user has the required permission
  if (!hasPermission(user.role, permission)) {
    return {
      authorized: false,
      response: ErrorResponses.forbidden(
        `Permission denied. Required: ${permission}`
      ),
    };
  }
  
  return {
    authorized: true,
    user,
  };
}

/**
 * Require any of the specified permissions.
 * 
 * @param request - Next.js request object
 * @param permissions - Array of permissions (any one grants access)
 * @returns Object with authorized status and either user or error response
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[]
): Promise<PermissionCheckResult> {
  const user = await getAdminUserFromRequest(request);
  
  if (!user) {
    return {
      authorized: false,
      response: ErrorResponses.authenticationRequired('Admin authentication required'),
    };
  }
  
  const hasAny = permissions.some(p => hasPermission(user.role, p));
  
  if (!hasAny) {
    return {
      authorized: false,
      response: ErrorResponses.forbidden(
        `Permission denied. Required one of: ${permissions.join(', ')}`
      ),
    };
  }
  
  return {
    authorized: true,
    user,
  };
}
