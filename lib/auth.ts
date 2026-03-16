import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from './roles';

/**
 * JWT Secret validation - CRITICAL SECURITY
 * 
 * In production: JWT_SECRET MUST be set or app will not start
 * In development: Allows fallback but logs loud warning
 * 
 * Never use the default secret in production!
 */
function getJWTSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is not set. ' +
        'Application cannot run in production without a secure JWT secret. ' +
        'Set JWT_SECRET in your environment variables.'
      );
    }
    
    // Development fallback with loud warning
    console.warn(
      '\n' +
      '⚠️  WARNING: JWT_SECRET is not set! Using insecure default.\n' +
      '⚠️  This is ONLY acceptable in development.\n' +
      '⚠️  Set JWT_SECRET environment variable before deploying.\n'
    );
    return new TextEncoder().encode('dev-only-insecure-secret-change-before-production');
  }
  
  return new TextEncoder().encode(secret);
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function generateToken(user: User): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJWTSecretKey());
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecretKey());
    return payload;
  } catch (error) {
    return null;
  }
}
