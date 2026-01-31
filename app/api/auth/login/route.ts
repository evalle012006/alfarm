import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { isAdminRoleAllowlisted, ROLE_GUEST } from '@/lib/roles';

/**
 * Admin cookie configuration
 */
const ADMIN_COOKIE_NAME = 'admin_token';
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * POST /api/auth/login
 * 
 * Unified login endpoint for both guest and admin users.
 * 
 * SECURITY:
 * - Ignores any `role` in request body
 * - Role is determined from database only
 * - Admin users get httpOnly cookie (no token in response body)
 * - Guest users get token in response body (for localStorage)
 * - Rate limited to prevent brute force
 */
export async function POST(request: NextRequest) {
  // ============================================
  // RATE LIMITING
  // ============================================
  const rateLimitResponse = checkRateLimit(
    request,
    RateLimitPresets.auth.limit,
    RateLimitPresets.auth.windowMs
  );
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // SECURITY: Ignore any `role` in request body - role comes from DB only
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Get user from database by email only (no role filter)
    const result = await pool.query(
      'SELECT id, email, password, first_name, last_name, phone, role, is_active FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      // Generic error - don't reveal if user exists
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check if user is active (Phase 3: staff can be disabled)
    if (user.is_active === false) {
      // Generic error - don't reveal account is disabled
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      // Generic error - don't reveal which check failed
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get role from database (source of truth)
    const dbRole = user.role;

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: dbRole,
    });

    // ============================================
    // ADMIN LOGIN (cookie-based auth)
    // ============================================
    if (isAdminRoleAllowlisted(dbRole)) {
      const response = NextResponse.json({
        ok: true,
        user: {
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: dbRole,
        },
      });

      // Set httpOnly cookie for admin auth
      response.cookies.set(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ADMIN_COOKIE_MAX_AGE,
      });

      return response;
    }

    // ============================================
    // GUEST LOGIN (token in response body)
    // ============================================
    if (dbRole === ROLE_GUEST) {
      return NextResponse.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: dbRole,
        },
      });
    }

    // ============================================
    // UNKNOWN ROLE - deny access
    // ============================================
    // Any role not explicitly handled is denied
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
