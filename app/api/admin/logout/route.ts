import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin cookie name - must match middleware.ts and login endpoint
 */
const ADMIN_COOKIE_NAME = 'admin_token';

/**
 * POST /api/admin/logout
 * 
 * Clears the admin authentication cookie.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  // Clear the admin cookie
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });

  return response;
}
