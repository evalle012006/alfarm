import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError } from '@/lib/apiErrors';

export const dynamic = 'force-dynamic';

// GET - Dashboard statistics
export async function GET(request: NextRequest) {
  const check = await requirePermission(request, 'bookings:read');
  if (!check.authorized) return check.response;

  try {
    // 1. Booking stats (single query with conditional aggregation)
    const bookingStatsResult = await pool.query(`
      SELECT
        COUNT(*)::int AS "totalBookings",
        COUNT(*) FILTER (WHERE status = 'pending')::int AS "pendingBookings",
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS "confirmedBookings",
        COUNT(*) FILTER (WHERE status = 'checked_in')::int AS "checkedInBookings",
        COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE AND status IN ('confirmed', 'pending'))::int AS "todayArrivalsCount",
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::float AS "totalRevenue",
        COALESCE(SUM(total_amount) FILTER (WHERE booking_date = CURRENT_DATE AND payment_status = 'paid'), 0)::float AS "todayRevenue"
      FROM bookings
    `);

    // 2. Total active products
    const productsResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM products WHERE is_active = true`
    );

    // 3. Today's arrivals (up to 10)
    const arrivalsResult = await pool.query(`
      SELECT
        b.id,
        b.guest_first_name,
        b.guest_last_name,
        b.guest_email,
        b.booking_type,
        b.status,
        b.payment_status,
        b.total_amount,
        b.booking_time
      FROM bookings b
      WHERE b.booking_date = CURRENT_DATE
        AND b.status IN ('confirmed', 'pending', 'checked_in')
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    // 4. Recent activity from audit logs (up to 10)
    const activityResult = await pool.query(`
      SELECT
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.created_at,
        COALESCE(u.first_name || ' ' || u.last_name, 'System') AS actor_name
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    const stats = bookingStatsResult.rows[0];

    return NextResponse.json({
      totalBookings: stats.totalBookings,
      pendingBookings: stats.pendingBookings,
      confirmedBookings: stats.confirmedBookings,
      checkedInBookings: stats.checkedInBookings,
      totalRevenue: stats.totalRevenue,
      todayRevenue: stats.todayRevenue,
      todayArrivalsCount: stats.todayArrivalsCount,
      totalProducts: productsResult.rows[0].count,
      todayArrivals: arrivalsResult.rows.map((r: any) => ({
        id: r.id,
        guestName: `${r.guest_first_name || ''} ${r.guest_last_name || ''}`.trim() || r.guest_email,
        bookingType: r.booking_type,
        bookingTime: r.booking_time,
        status: r.status,
        paymentStatus: r.payment_status,
        totalAmount: parseFloat(r.total_amount),
      })),
      recentActivity: activityResult.rows.map((r: any) => ({
        id: r.id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        actorName: r.actor_name,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
