import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, generateToken, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone, role } = await request.json();

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
      'SELECT id, password, role FROM users WHERE email = $1',
      [email]
    );

    let userId: number;
    let userRole: 'admin' | 'guest' | 'root';
    let isClaimedAccount = false;

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      
      // Check if this is a shadow account (placeholder password from guest checkout)
      // Shadow accounts have an invalid bcrypt hash that starts with '$2a$10$placeholder'
      const isShadowAccount = existing.password.includes('placeholder');
      
      if (!isShadowAccount) {
        // Real account exists - check if they're trying to re-register
        return NextResponse.json(
          { error: 'Email already registered. Please login instead.' },
          { status: 400 }
        );
      }

      // Claim the shadow account - update with real password
      const hashedPassword = await hashPassword(password);
      await pool.query(
        `UPDATE users 
         SET password = $1, first_name = $2, last_name = $3, phone = COALESCE($4, phone), updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [hashedPassword, firstName, lastName, phone || null, existing.id]
      );

      userId = existing.id;
      userRole = existing.role; // Keep existing role (guest)
      isClaimedAccount = true;
    } else {
      // New user - create account
      const hashedPassword = await hashPassword(password);

      const result = await pool.query(
        'INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [email, hashedPassword, firstName, lastName, phone || null, role || 'guest']
      );

      userId = result.rows[0].id;
      userRole = role || 'guest';
    }

    // Generate token
    const token = generateToken({
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
