import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';

export const dynamic = 'force-dynamic';

// GET - Generate reports data
export async function GET(request: NextRequest) {
  const check = await requirePermission(request, 'bookings:read');
  if (!check.authorized) return check.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30'; // days
    const type = searchParams.get('type') || 'overview';

    const days = Math.min(parseInt(range) || 30, 365);

    if (type === 'overview') {
      // Revenue by day
      const revenueByDay = await pool.query(`
        SELECT
          booking_date::text AS date,
          COUNT(*)::int AS bookings,
          COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::float AS revenue
        FROM bookings
        WHERE booking_date >= CURRENT_DATE - $1::int
          AND status != 'cancelled'
        GROUP BY booking_date
        ORDER BY booking_date
      `, [days]);

      // Status breakdown
      const statusBreakdown = await pool.query(`
        SELECT
          status,
          COUNT(*)::int AS count
        FROM bookings
        WHERE booking_date >= CURRENT_DATE - $1::int
        GROUP BY status
        ORDER BY count DESC
      `, [days]);

      // Payment method breakdown
      const paymentMethods = await pool.query(`
        SELECT
          COALESCE(payment_method, 'unknown') AS method,
          COUNT(*)::int AS count,
          COALESCE(SUM(total_amount), 0)::float AS total
        FROM bookings
        WHERE booking_date >= CURRENT_DATE - $1::int
          AND status != 'cancelled'
        GROUP BY payment_method
        ORDER BY total DESC
      `, [days]);

      // Top products
      const topProducts = await pool.query(`
        SELECT
          p.name,
          c.name AS category,
          SUM(bi.quantity)::int AS total_booked,
          SUM(bi.subtotal)::float AS total_revenue
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        JOIN products p ON bi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE b.booking_date >= CURRENT_DATE - $1::int
          AND b.status != 'cancelled'
        GROUP BY p.id, p.name, c.name
        ORDER BY total_revenue DESC
        LIMIT 10
      `, [days]);

      // Summary totals
      const summary = await pool.query(`
        SELECT
          COUNT(*)::int AS total_bookings,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
          COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::float AS total_revenue,
          COALESCE(AVG(total_amount) FILTER (WHERE status != 'cancelled'), 0)::float AS avg_booking_value,
          COUNT(DISTINCT user_id)::int AS unique_guests
        FROM bookings
        WHERE booking_date >= CURRENT_DATE - $1::int
      `, [days]);

      return NextResponse.json({
        range: days,
        summary: summary.rows[0],
        revenueByDay: revenueByDay.rows,
        statusBreakdown: statusBreakdown.rows,
        paymentMethods: paymentMethods.rows,
        topProducts: topProducts.rows,
      });
    }

    return ErrorResponses.validationError('Invalid report type');
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
