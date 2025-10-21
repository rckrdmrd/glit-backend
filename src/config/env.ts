/**
 * Environment Configuration
 *
 * Centralized environment variable configuration with validation.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment configuration interface
 */
interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;

  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolMin: number;
    poolMax: number;
  };

  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // CORS
  corsOrigin: string;

  // Logging
  logLevel: string;
}

/**
 * Get environment variable with default value
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

/**
 * Parse integer environment variable
 */
function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * Application environment configuration
 */
export const envConfig: EnvConfig = {
  // Server
  port: getEnvInt('PORT', 3006),
  nodeEnv: getEnv('NODE_ENV', 'development'),

  // Database
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvInt('DB_PORT', 5432),
    name: getEnv('DB_NAME', 'glit_db'),
    user: getEnv('DB_USER', 'glit_user'),
    password: getEnv('DB_PASSWORD', ''),
    poolMin: getEnvInt('DB_POOL_MIN', 2),
    poolMax: getEnvInt('DB_POOL_MAX', 10),
  },

  // JWT
  jwt: {
    secret: process.env.NODE_ENV === 'production'
      ? getEnv('JWT_SECRET')  // No default in production - will throw if not set
      : getEnv('JWT_SECRET', 'dev_secret_not_for_production_use'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
    refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
  },

  // CORS
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:3000'),

  // Logging
  logLevel: getEnv('LOG_LEVEL', 'debug'),
};

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file.'
    );
  }

  // Validate JWT secret strength in production
  if (envConfig.nodeEnv === 'production') {
    if (envConfig.jwt.secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters in production. ' +
        'Generate with: openssl rand -base64 32'
      );
    }
  }

  console.log('✓ Environment variables validated');
}

export default envConfig;
