#!/usr/bin/env node
/**
 * Seed test users for RBAC testing
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'alfarm',
  password: process.env.DB_PASSWORD || 'testpassword123',
  database: process.env.DB_NAME || 'alfarm',
  ssl: false,
});

async function seedUsers() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Generated hash:', hash);
  
  try {
    // Update admin user
    await pool.query(
      `UPDATE users SET password = $1 WHERE email = 'admin@alfarm.com'`,
      [hash]
    );
    console.log('Updated admin@alfarm.com password');
    
    // Upsert cashier user
    await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role, is_active)
       VALUES ('cashier@alfarm.com', $1, 'Test', 'Cashier', 'cashier', true)
       ON CONFLICT (email) DO UPDATE SET password = $1`,
      [hash]
    );
    console.log('Upserted cashier@alfarm.com');
    
    // Verify
    const result = await pool.query(
      `SELECT email, role, substring(password, 1, 10) as pwd_prefix FROM users WHERE role != 'guest'`
    );
    console.log('Users:', result.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedUsers();
