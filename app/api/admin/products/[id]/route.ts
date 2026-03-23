import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { handleUnexpectedError, ErrorResponses } from '@/lib/apiErrors';
import { logAuditWithRequest, AuditActions, EntityTypes, createSnapshot } from '@/lib/audit';

// GET - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'inventory:read');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return ErrorResponses.validationError('Invalid product ID');
    }

    const result = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return ErrorResponses.notFound('Product not found');
    }

    return NextResponse.json({
      ...result.rows[0],
      price: parseFloat(result.rows[0].price),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}

// PATCH - Update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'inventory:manage');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return ErrorResponses.validationError('Invalid product ID');
    }

    const existing = await pool.query(
      'SELECT id, name, category_id, price, pricing_unit, inventory_count, is_active FROM products WHERE id = $1',
      [productId]
    );
    if (existing.rows.length === 0) {
      return ErrorResponses.notFound('Product not found');
    }
    const beforeProduct = existing.rows[0];

    const body = await request.json();
    const allowedFields: Record<string, string> = {
      name: 'name',
      category_id: 'category_id',
      description: 'description',
      capacity: 'capacity',
      price: 'price',
      pricing_unit: 'pricing_unit',
      time_slot: 'time_slot',
      inventory_count: 'inventory_count',
      image_url: 'image_url',
      is_active: 'is_active',
    };

    const validPricingUnits = ['fixed', 'per_head', 'per_hour', 'per_night'];
    const validTimeSlots = ['day', 'night', 'any'];

    if (body.pricing_unit && !validPricingUnits.includes(body.pricing_unit)) {
      return ErrorResponses.validationError(`Invalid pricing_unit. Must be one of: ${validPricingUnits.join(', ')}`);
    }

    if (body.time_slot && !validTimeSlots.includes(body.time_slot)) {
      return ErrorResponses.validationError(`Invalid time_slot. Must be one of: ${validTimeSlots.join(', ')}`);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, col] of Object.entries(allowedFields)) {
      if (body[key] !== undefined) {
        updates.push(`${col} = $${paramIndex}`);
        values.push(body[key]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return ErrorResponses.validationError('No valid fields to update');
    }

    values.push(productId);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    const updatedProduct = result.rows[0];

    // Audit log
    logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.PRODUCT_UPDATE,
      entityType: EntityTypes.PRODUCT,
      entityId: productId,
      metadata: {
        ...createSnapshot(
          { name: beforeProduct.name, price: parseFloat(beforeProduct.price), inventoryCount: beforeProduct.inventory_count, isActive: beforeProduct.is_active },
          { name: updatedProduct.name, price: parseFloat(updatedProduct.price), inventoryCount: updatedProduct.inventory_count, isActive: updatedProduct.is_active }
        ),
      },
    }).catch((err) => console.error('Audit log failed:', err));

    return NextResponse.json({
      message: 'Product updated successfully',
      product: { ...updatedProduct, price: parseFloat(updatedProduct.price) },
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}

// DELETE - Deactivate product (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'inventory:manage');
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return ErrorResponses.validationError('Invalid product ID');
    }

    // Check for active bookings using this product
    const activeBookings = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM booking_items bi
       JOIN bookings b ON bi.booking_id = b.id
       WHERE bi.product_id = $1
         AND b.status IN ('pending', 'confirmed', 'checked_in')`,
      [productId]
    );

    if (activeBookings.rows[0].count > 0) {
      return ErrorResponses.validationError(`Cannot deactivate product — it has ${activeBookings.rows[0].count} active booking(s).`);
    }

    const result = await pool.query(
      `UPDATE products SET is_active = false WHERE id = $1 RETURNING id, name, is_active`,
      [productId]
    );

    if (result.rows.length === 0) {
      return ErrorResponses.notFound('Product not found');
    }

    // Audit log
    logAuditWithRequest(request, {
      actorUserId: check.user.id,
      actorEmail: check.user.email,
      action: AuditActions.PRODUCT_DISABLE,
      entityType: EntityTypes.PRODUCT,
      entityId: productId,
      metadata: {
        ...createSnapshot(
          { isActive: true },
          { isActive: false }
        ),
        productName: result.rows[0].name,
      },
    }).catch((err) => console.error('Audit log failed:', err));

    return NextResponse.json({
      message: 'Product deactivated successfully',
      product: result.rows[0],
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
