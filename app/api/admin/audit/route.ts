import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';

/**
 * Query parameters schema for audit log filtering
 */
const AuditQuerySchema = z.object({
  action: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  actor_email: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/admin/audit
 * 
 * List audit logs with filtering and pagination.
 * Permission: audit:read (super_admin only by default)
 */
export async function GET(request: NextRequest) {
  // RBAC: Require audit:read permission
  const check = await requirePermission(request, 'audit:read');
  if (!check.authorized) return check.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate query parameters
    const parseResult = AuditQuerySchema.safeParse({
      action: searchParams.get('action') || undefined,
      entity_type: searchParams.get('entity_type') || undefined,
      entity_id: searchParams.get('entity_id') || undefined,
      actor_email: searchParams.get('actor_email') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      limit: searchParams.get('limit') || 50,
      offset: searchParams.get('offset') || 0,
    });

    if (!parseResult.success) {
      return ErrorResponses.validationError('Invalid query parameters', parseResult.error.flatten());
    }

    const { action, entity_type, entity_id, actor_email, start_date, end_date, limit, offset } = parseResult.data;

    // Build query with filters
    let query = `
      SELECT 
        al.id,
        al.actor_user_id,
        al.actor_email,
        al.action,
        al.entity_type,
        al.entity_id,
        al.metadata,
        al.created_at,
        u.first_name as actor_first_name,
        u.last_name as actor_last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE 1=1
    `;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (entity_type) {
      query += ` AND al.entity_type = $${paramIndex}`;
      params.push(entity_type);
      paramIndex++;
    }

    if (entity_id) {
      query += ` AND al.entity_id = $${paramIndex}`;
      params.push(entity_id);
      paramIndex++;
    }

    if (actor_email) {
      query += ` AND al.actor_email ILIKE $${paramIndex}`;
      params.push(`%${actor_email}%`);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND al.created_at >= $${paramIndex}::timestamp`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND al.created_at <= $${paramIndex}::timestamp`;
      params.push(end_date);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM audit_logs al WHERE 1=1`;
    const countParams: (string | number)[] = [];
    let countParamIndex = 1;

    if (action) {
      countQuery += ` AND al.action = $${countParamIndex}`;
      countParams.push(action);
      countParamIndex++;
    }

    if (entity_type) {
      countQuery += ` AND al.entity_type = $${countParamIndex}`;
      countParams.push(entity_type);
      countParamIndex++;
    }

    if (entity_id) {
      countQuery += ` AND al.entity_id = $${countParamIndex}`;
      countParams.push(entity_id);
      countParamIndex++;
    }

    if (actor_email) {
      countQuery += ` AND al.actor_email ILIKE $${countParamIndex}`;
      countParams.push(`%${actor_email}%`);
      countParamIndex++;
    }

    if (start_date) {
      countQuery += ` AND al.created_at >= $${countParamIndex}::timestamp`;
      countParams.push(start_date);
      countParamIndex++;
    }

    if (end_date) {
      countQuery += ` AND al.created_at <= $${countParamIndex}::timestamp`;
      countParams.push(end_date);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      logs: result.rows.map(row => ({
        id: row.id,
        actorUserId: row.actor_user_id,
        actorEmail: row.actor_email,
        actorName: row.actor_first_name && row.actor_last_name 
          ? `${row.actor_first_name} ${row.actor_last_name}` 
          : null,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: row.metadata,
        createdAt: row.created_at,
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + result.rows.length < totalCount,
      },
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return handleUnexpectedError(error);
  }
}
