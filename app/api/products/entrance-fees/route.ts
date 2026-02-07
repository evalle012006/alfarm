import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { handleUnexpectedError } from '@/lib/apiErrors';

/**
 * GET /api/products/entrance-fees
 * Returns entrance fee products grouped by time_slot and type (adult/child).
 * Used by homepage, results page, and checkout to display dynamic pricing.
 */
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.time_slot
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE c.name = 'Entrance Fee'
        AND p.is_active = true
      ORDER BY p.time_slot, p.name
    `);

    const fees: {
      day: { adult: { id: number; price: number } | null; child: { id: number; price: number } | null };
      night: { adult: { id: number; price: number } | null; child: { id: number; price: number } | null };
    } = {
      day: { adult: null, child: null },
      night: { adult: null, child: null },
    };

    for (const row of result.rows) {
      const slot = row.time_slot as 'day' | 'night';
      const name = (row.name as string).toLowerCase();
      const entry = { id: row.id, price: parseFloat(row.price) };

      if (slot === 'day' || slot === 'night') {
        if (name.includes('adult')) {
          fees[slot].adult = entry;
        } else if (name.includes('kid') || name.includes('child')) {
          fees[slot].child = entry;
        }
      }
    }

    return NextResponse.json(fees);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
