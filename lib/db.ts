import { Pool } from 'pg';

/**
 * PostgreSQL connection pool (singleton pattern)
 * 
 * Configuration:
 * - max: 20 connections - adjust based on expected concurrent load
 * - idleTimeoutMillis: 30s - connections idle longer than this are closed
 * - connectionTimeoutMillis: 2s - fail fast if DB is unreachable
 * 
 * SSL Configuration:
 * - Disabled for localhost (development)
 * - Enabled with rejectUnauthorized: false for remote databases
 * 
 * Why rejectUnauthorized: false?
 * This is commonly needed for managed database services (e.g., Heroku, DigitalOcean)
 * that use self-signed certificates. In production with proper CA-signed certs,
 * consider setting this to true or providing ca/cert options.
 * 
 * Production Recommendations:
 * - Use connection pooling at infrastructure level (PgBouncer)
 * - Set all DB_* environment variables explicitly
 * - Consider SSL with proper certificate validation
 * - Monitor connection pool metrics
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'alfarm_resort',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'false' ? false : (process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== 'db' ? { rejectUnauthorized: false } : false),
});

export default pool;
