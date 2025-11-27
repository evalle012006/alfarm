import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryName = searchParams.get('category');
    const timeSlot = searchParams.get('time_slot');

    let query = `
      SELECT 
        p.id,
        p.name as title,
        p.price as "pricePerNight",
        p.capacity as "maxCapacity",
        p.description,
        p.pricing_unit,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;

    const params: any[] = [];

    if (categoryName) {
      query += ` AND c.name = $${params.length + 1}`;
      params.push(categoryName);
    }

    if (timeSlot) {
      query += ` AND (p.time_slot = $${params.length + 1} OR p.time_slot = 'any')`;
      params.push(timeSlot);
    }

    query += ' ORDER BY p.category_id, p.price';

    const result = await pool.query(query, params);

    // Transform data to match frontend expectations
    const products = result.rows.map(row => {
        // Derive simple type for UI badges
        let type = 'room';
        if (row.category_name.includes('Entrance')) type = 'day-use';
        if (row.category_name.includes('Rentals')) type = 'add-on';
        
        // Format capacity string
        const capacity = [];
        if (row.pricing_unit === 'per_head') {
            capacity.push('Per Person');
        } else if (row.maxCapacity > 0) {
            capacity.push(`Up to ${row.maxCapacity} Guests`);
        }

        return {
            id: row.id,
            title: row.title,
            pricePerNight: parseFloat(row.pricePerNight), // pg returns decimals as strings
            capacity: capacity,
            description: row.description || '',
            type: type,
            category: row.category_name
        };
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
