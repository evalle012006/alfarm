import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError } from '@/lib/apiErrors';

// GET - List all guest users with booking stats
export async function GET(request: NextRequest) {
    // RBAC: Require staff:read permission
    const check = await requirePermission(request, 'staff:read');
    if (!check.authorized) return check.response;

    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search');
        const sort = searchParams.get('sort') || 'newest';
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Shadow account hash pattern from implementation
        const shadowHash = '$2a$10$placeholderHashForGuestCheckout................';

        let query = `
      SELECT 
        u.id, 
        u.email, 
        u.first_name as "firstName", 
        u.last_name as "lastName", 
        u.phone, 
        u.role, 
        u.is_active as "isActive", 
        u.created_at as "createdAt",
        (u.password = $1) as "isShadow",
        COUNT(b.id)::int as "totalBookings",
        MAX(b.booking_date) as "lastBookingDate",
        COALESCE(SUM(b.total_amount), 0)::float as "totalSpent"
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id
      WHERE u.role = 'guest'
    `;

        const params: any[] = [shadowHash];
        let paramIndex = 2;

        if (search) {
            query += ` AND (
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR
        u.phone ILIKE $${paramIndex}
      )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` GROUP BY u.id`;

        // Sorting logic
        switch (sort) {
            case 'bookings':
                query += ` ORDER BY "totalBookings" DESC, "createdAt" DESC`;
                break;
            case 'alpha':
                query += ` ORDER BY u.last_name ASC, u.first_name ASC`;
                break;
            case 'newest':
            default:
                query += ` ORDER BY u.created_at DESC`;
                break;
        }

        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) FROM users WHERE role = 'guest'`;
        const countParams: any[] = [];
        if (search) {
            countQuery += ` AND (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
            countParams.push(`%${search}%`);
        }
        const countResult = await pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        return NextResponse.json({
            guests: result.rows,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + result.rows.length < totalCount
            }
        });

    } catch (error) {
        return handleUnexpectedError(error, 'Failed to fetch guests');
    }
}
