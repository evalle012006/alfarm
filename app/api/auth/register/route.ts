import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, generateToken, verifyPassword } from '@/lib/auth';
import { ROLE_GUEST } from '@/lib/roles';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Destructure but IGNORE any client-provided 'role' field
    // Registration ALWAYS creates guest accounts. Admin accounts must be created
    // through other means (direct DB insert, admin panel, etc.)
    const { email, password, firstName, lastName, phone } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, password, role, COALESCE(is_shadow, FALSE) as is_shadow FROM users WHERE email = $1',
      [email]
    );

    let userId: number;
    let userRole: 'admin' | 'guest' | 'root';
    let isClaimedAccount = false;

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      
      // Check if this is a shadow account using the is_shadow column (authoritative flag)
      const isShadowAccount = existing.is_shadow === true;
      
      if (!isShadowAccount) {
        // Real account exists - check if they're trying to re-register
        return NextResponse.json(
          { error: 'Email already registered. Please login instead.' },
          { status: 400 }
        );
      }

      // Claim the shadow account - update with real password and clear shadow flag
      const hashedPassword = await hashPassword(password);
      await pool.query(
        `UPDATE users 
         SET password = $1, first_name = $2, last_name = $3, phone = COALESCE($4, phone), is_shadow = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [hashedPassword, firstName, lastName, phone || null, existing.id]
      );

      userId = existing.id;
      userRole = existing.role; // Keep existing role (guest)
      isClaimedAccount = true;
    } else {
      // New user - create account with ROLE_GUEST (always)
      const hashedPassword = await hashPassword(password);

      const result = await pool.query(
        'INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [email, hashedPassword, firstName, lastName, phone || null, ROLE_GUEST]
      );

      userId = result.rows[0].id;
      userRole = ROLE_GUEST;
    }

    // Generate token
    const token = await generateToken({
      id: userId,
      email,
      firstName,
      lastName,
      role: userRole,
    });

    // Return user data and token
    return NextResponse.json({
      token,
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        phone,
        role: userRole,
      },
      claimed: isClaimedAccount,
      message: isClaimedAccount 
        ? 'Account claimed successfully! Your previous bookings are now linked.' 
        : 'Registration successful!',
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
