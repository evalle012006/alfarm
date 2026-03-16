import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';

// GET - List all categories
export async function GET(request: NextRequest) {
  const check = await requirePermission(request, 'inventory:read');
  if (!check.authorized) return check.response;

  try {
    const result = await pool.query(
      `SELECT id, name, description, created_at FROM categories ORDER BY id`
    );

    return NextResponse.json({ categories: result.rows });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  const check = await requirePermission(request, 'inventory:manage');
  if (!check.authorized) return check.response;

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return ErrorResponses.validationError('Category name is required');
    }

    // Check for duplicate
    const existing = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    if (existing.rows.length > 0) {
      return ErrorResponses.conflict('Category already exists');
    }

    const result = await pool.query(
      `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description || '']
    );

    return NextResponse.json(
      { message: 'Category created successfully', category: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
