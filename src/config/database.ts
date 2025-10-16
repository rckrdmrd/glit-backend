/**
 * Database Configuration
 *
 * PostgreSQL database configuration and utilities.
 */

import { PoolConfig } from 'pg';
import { envConfig } from './env';

/**
 * PostgreSQL Pool Configuration
 */
export const databaseConfig: PoolConfig = {
  host: envConfig.database.host,
  port: envConfig.database.port,
  database: envConfig.database.name,
  user: envConfig.database.user,
  password: envConfig.database.password,
  min: envConfig.database.poolMin,
  max: envConfig.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

/**
 * Database query timeout (milliseconds)
 */
export const QUERY_TIMEOUT = 30000;

/**
 * Maximum retry attempts for failed queries
 */
export const MAX_RETRY_ATTEMPTS = 3;

export default databaseConfig;
