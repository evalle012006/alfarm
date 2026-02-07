import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { isAdminRoleAllowlisted } from '@/lib/roles';

/**
 * Admin cookie name - must match the one set in /api/auth/login
 */
const ADMIN_COOKIE_NAME = 'admin_token';

/**
 * Get JWT secret as Uint8Array for jose library
 */
function getJWTSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    // Development fallback - must match lib/auth.ts
    return new TextEncoder().encode('dev-only-insecure-secret-change-before-production');
  }
  
  return new TextEncoder().encode(secret);
}

/**
 * Verify JWT token and extract payload
 */
async function verifyAdminToken(token: string): Promise<{ userId: number; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecretKey());
    
    // Extract required fields from payload
    const userId = payload.id as number;
    const email = payload.email as string;
    const role = payload.role as string;
    
    if (!userId || !email || !role) {
      return null;
    }
    
    return { userId, email, role };
  } catch (error) {
    // Token invalid or expired
    return null;
  }
}

/**
 * Next.js Middleware for Admin Route Protection
 * 
 * SECURITY:
 * - Protects all /admin/* routes except /admin/login
 * - Reads admin_token from httpOnly cookie
 * - Verifies JWT signature and expiration
 * - Checks role against explicit allowlist
 * - Redirects to /admin/login on failure
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // ADMIN ROUTE PROTECTION
  // ============================================
  if (pathname.startsWith('/admin')) {
    // Allow access to login page without auth
    if (pathname === '/admin/login') {
      // If already authenticated as admin, redirect to dashboard
      const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
      
      if (token) {
        const payload = await verifyAdminToken(token);
        
        if (payload && isAdminRoleAllowlisted(payload.role)) {
          // Already authenticated - redirect to dashboard
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      }
      
      // Not authenticated - allow access to login page
      return NextResponse.next();
    }

    // For all other /admin/* routes, require authentication
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      // No token - redirect to login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const payload = await verifyAdminToken(token);

    if (!payload) {
      // Invalid or expired token - redirect to login
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      // Clear invalid cookie
      response.cookies.delete(ADMIN_COOKIE_NAME);
      return response;
    }

    // Check role against allowlist (NOT normalization)
    if (!isAdminRoleAllowlisted(payload.role)) {
      // Role not allowed - redirect to login
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      // Clear cookie for non-admin role
      response.cookies.delete(ADMIN_COOKIE_NAME);
      return response;
    }

    // Authenticated admin - allow access
    return NextResponse.next();
  }

  // ============================================
  // ADMIN API ROUTE PROTECTION
  // ============================================
  if (pathname.startsWith('/api/admin')) {

    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyAdminToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!isAdminRoleAllowlisted(payload.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Authenticated admin - allow API access
    return NextResponse.next();
  }

  // All other routes - no protection needed
  return NextResponse.next();
}

/**
 * Middleware matcher configuration
 * Only run middleware on admin routes for performance
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
