/**
 * PostgreSQL Connection Pool
 *
 * Creates and manages database connection pool using native 'pg' package.
 * Implements connection error handling and pool event logging.
 */

import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * PostgreSQL Pool Configuration
 */
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'glit_db',
  user: process.env.DB_USER || 'glit_user',
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

/**
 * Global connection pool instance
 */
export const pool = new Pool(poolConfig);

/**
 * Pool event handlers for logging and monitoring
 */

// Log when a new client is connected
pool.on('connect', (client) => {
  console.log('✓ New database client connected');
});

// Log when a client encounters an error
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle database client:', err);
});

// Log when a client is removed from the pool
pool.on('remove', (client) => {
  console.log('⚠ Database client removed from pool');
});

/**
 * Test database connection
 *
 * @returns Promise<boolean> - True if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✓ Database connection successful');
    console.log(`  PostgreSQL Version: ${result.rows[0].postgres_version.split(',')[0]}`);
    console.log(`  Server Time: ${result.rows[0].current_time}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Close all pool connections gracefully
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('✓ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
}

/**
 * Get pool statistics
 *
 * @returns Pool statistics object
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

export default pool;
