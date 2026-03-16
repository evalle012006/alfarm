import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError } from '@/lib/apiErrors';
import { sanitizeSearch } from '@/lib/sanitize';
import { parsePagination, buildPaginationResponse } from '@/lib/pagination';

// GET - List all products (admin, includes inactive)
export async function GET(request: NextRequest) {
  const check = await requirePermission(request, 'inventory:read');
  if (!check.authorized) return check.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = sanitizeSearch(searchParams.get('search'));
    const category = searchParams.get('category');
    const isActive = searchParams.get('is_active');
    const { limit, offset } = parsePagination({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      page: searchParams.get('page'),
      per_page: searchParams.get('per_page'),
    });

    let query = `
      SELECT
        p.id,
        p.name,
        p.category_id,
        c.name AS category_name,
        p.description,
        p.capacity,
        p.price,
        p.pricing_unit,
        p.time_slot,
        p.inventory_count,
        p.image_url,
        p.is_active,
        p.created_at
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category && category !== 'all') {
      query += ` AND c.name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query += ` AND p.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    // Count query
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM products p/,
      'SELECT COUNT(*)::int AS count FROM products p'
    );
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0].count;

    query += ` ORDER BY p.category_id, p.name`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return NextResponse.json({
      products: result.rows.map((r: any) => ({
        ...r,
        price: parseFloat(r.price),
      })),
      pagination: buildPaginationResponse(total, limit, offset),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  const check = await requirePermission(request, 'inventory:manage');
  if (!check.authorized) return check.response;

  try {
    const body = await request.json();
    const {
      name,
      category_id,
      description,
      capacity,
      price,
      pricing_unit,
      time_slot,
      inventory_count,
      image_url,
      is_active,
    } = body;

    if (!name || !category_id || price === undefined || !pricing_unit || !time_slot) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category_id, price, pricing_unit, time_slot' },
        { status: 400 }
      );
    }

    const validPricingUnits = ['fixed', 'per_head', 'per_hour', 'per_night'];
    const validTimeSlots = ['day', 'night', 'any'];

    if (!validPricingUnits.includes(pricing_unit)) {
      return NextResponse.json(
        { error: `Invalid pricing_unit. Must be one of: ${validPricingUnits.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validTimeSlots.includes(time_slot)) {
      return NextResponse.json(
        { error: `Invalid time_slot. Must be one of: ${validTimeSlots.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO products (name, category_id, description, capacity, price, pricing_unit, time_slot, inventory_count, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name,
        category_id,
        description || '',
        capacity || 0,
        price,
        pricing_unit,
        time_slot,
        inventory_count || 1,
        image_url || null,
        is_active !== undefined ? is_active : true,
      ]
    );

    return NextResponse.json(
      {
        message: 'Product created successfully',
        product: { ...result.rows[0], price: parseFloat(result.rows[0].price) },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
