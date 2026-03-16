import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: 'admin' | 'guest' | 'root';
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Extracts and verifies JWT token from request headers
 * Returns user data if valid, error otherwise
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return { authenticated: false, error: 'No authorization header' };
  }

  // Support both "Bearer <token>" and raw token
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }

  const decoded = await verifyToken(token);
  
  if (!decoded) {
    return { authenticated: false, error: 'Invalid or expired token' };
  }

  return {
    authenticated: true,
    user: {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    },
  };
}

/**
 * Middleware helper to require authentication
 * Returns NextResponse error if not authenticated, null if OK
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const result = await authenticateRequest(request);
  
  if (!result.authenticated) {
    return NextResponse.json(
      { error: result.error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return null;
}

/**
 * Middleware helper to require specific role(s)
 * Returns NextResponse error if not authorized, null if OK
 */
export async function requireRole(
  request: NextRequest, 
  allowedRoles: ('admin' | 'guest' | 'root')[]
): Promise<{ response: NextResponse | null; user?: AuthenticatedUser }> {
  const result = await authenticateRequest(request);
  
  if (!result.authenticated) {
    return {
      response: NextResponse.json(
        { error: result.error || 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  if (!result.user || !allowedRoles.includes(result.user.role)) {
    return {
      response: NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      ),
    };
  }

  return { response: null, user: result.user };
}

/**
 * Get current user from request (returns null if not authenticated)
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const result = await authenticateRequest(request);
  return result.authenticated ? result.user || null : null;
}
