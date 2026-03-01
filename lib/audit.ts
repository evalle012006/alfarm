/**
 * Audit Logging Utility
 * 
 * Provides centralized audit logging for admin actions.
 * All sensitive mutations should be logged for compliance and debugging.
 */

import { NextRequest } from 'next/server';
import pool from './db';

/**
 * Audit log entry data
 */
export interface AuditLogEntry {
  actorUserId: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string | number;
  metadata?: AuditMetadata;
}

/**
 * Metadata stored with audit logs
 */
export interface AuditMetadata {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  notes?: string;
  [key: string]: unknown;
}

/**
 * Standard audit action names
 */
export const AuditActions = {
  // Booking actions
  BOOKING_CREATE: 'booking.create',
  BOOKING_UPDATE: 'booking.update',
  BOOKING_CANCEL: 'booking.cancel',
  BOOKING_CHECKIN: 'booking.checkin',
  BOOKING_CHECKOUT: 'booking.checkout',

  // Payment actions
  PAYMENT_COLLECT: 'payment.collect',
  PAYMENT_VOID: 'payment.void',
  PAYMENT_REFUND: 'payment.refund',

  // Staff actions
  STAFF_CREATE: 'staff.create',
  STAFF_UPDATE: 'staff.update',
  STAFF_DISABLE: 'staff.disable',
  STAFF_ENABLE: 'staff.enable',
  STAFF_PASSWORD_RESET: 'staff.password_reset',
  STAFF_ROLE_CHANGE: 'staff.role_change',

  // Profile actions
  PROFILE_UPDATE: 'profile.update',
  PASSWORD_CHANGE: 'profile.password_change',
} as const;

/**
 * Entity types for audit logs
 */
export const EntityTypes = {
  BOOKING: 'booking',
  USER: 'user',
  PAYMENT: 'payment',
} as const;

/**
 * Extract client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (behind proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback - may not be accurate behind proxies
  return 'unknown';
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Log an audit entry to the database.
 * 
 * This should be called after successful mutations in admin API routes.
 * 
 * @param entry - The audit log entry data
 * @returns The created audit log ID
 */
export async function logAudit(entry: AuditLogEntry): Promise<number> {
  const { actorUserId, actorEmail, action, entityType, entityId, metadata } = entry;

  const result = await pool.query(
    `INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      actorUserId,
      actorEmail,
      action,
      entityType,
      String(entityId),
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  return result.rows[0].id;
}

/**
 * Log an audit entry with request context.
 * 
 * Convenience function that extracts IP and user-agent from the request.
 * 
 * @param request - The Next.js request object
 * @param entry - The audit log entry data (without IP/userAgent)
 * @returns The created audit log ID
 */
export async function logAuditWithRequest(
  request: NextRequest,
  entry: Omit<AuditLogEntry, 'metadata'> & { metadata?: Omit<AuditMetadata, 'ip' | 'userAgent'> }
): Promise<number> {
  const ip = getClientIP(request);
  const userAgent = getUserAgent(request);

  return logAudit({
    ...entry,
    metadata: {
      ...entry.metadata,
      ip,
      userAgent,
    },
  });
}

/**
 * Create a before/after snapshot for audit metadata
 */
export function createSnapshot(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Pick<AuditMetadata, 'before' | 'after'> {
  return {
    ...(before && { before }),
    ...(after && { after }),
  };
}
