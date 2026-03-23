import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';

/**
 * GET /api/admin/categories/[id]
 * 
 * Get a single category.
 * Permission: inventory:read
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'inventory:read');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return ErrorResponses.validationError('Invalid category ID');
    }

    const result = await pool.query(
      'SELECT id, name, description, is_active, created_at, updated_at FROM categories WHERE id = $1',
      [categoryId]
    );

    if (result.rows.length === 0) {
      return ErrorResponses.notFound('Category not found');
    }

    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}

/**
 * PATCH /api/admin/categories/[id]
 * 
 * Update a category (name, description, is_active).
 * Permission: inventory:manage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'inventory:manage');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return ErrorResponses.validationError('Invalid category ID');
    }

    const existing = await pool.query('SELECT id, name FROM categories WHERE id = $1', [categoryId]);
    if (existing.rows.length === 0) {
      return ErrorResponses.notFound('Category not found');
    }

    const body = await request.json();
    const { name, description, is_active } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      // Check for duplicate name
      const dup = await pool.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name, categoryId]
      );
      if (dup.rows.length > 0) {
        return ErrorResponses.conflict('A category with this name already exists');
      }
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (is_active !== undefined) {
      // If disabling, check for active products in this category
      if (is_active === false) {
        const activeProducts = await pool.query(
          'SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1 AND is_active = true',
          [categoryId]
        );
        if (activeProducts.rows[0].count > 0) {
          return ErrorResponses.validationError(
            `Cannot disable category — it has ${activeProducts.rows[0].count} active product(s). Disable them first.`
          );
        }
      }
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return ErrorResponses.validationError('No valid fields to update');
    }

    values.push(categoryId);
    const result = await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({
      message: 'Category updated successfully',
      category: result.rows[0],
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * 
 * Disable a category (soft disable).
 * Permission: inventory:manage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'inventory:manage');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return ErrorResponses.validationError('Invalid category ID');
    }

    // Check for active products
    const activeProducts = await pool.query(
      'SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1 AND is_active = true',
      [categoryId]
    );
    if (activeProducts.rows[0].count > 0) {
      return ErrorResponses.validationError(
        `Cannot disable category — it has ${activeProducts.rows[0].count} active product(s). Disable them first.`
      );
    }

    const result = await pool.query(
      `UPDATE categories SET is_active = false WHERE id = $1 RETURNING id, name, is_active`,
      [categoryId]
    );

    if (result.rows.length === 0) {
      return ErrorResponses.notFound('Category not found');
    }

    return NextResponse.json({
      message: 'Category disabled successfully',
      category: result.rows[0],
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
