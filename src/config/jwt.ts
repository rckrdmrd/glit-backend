/**
 * JWT Configuration
 *
 * JSON Web Token configuration for authentication.
 */

import { envConfig } from './env';

/**
 * JWT Configuration
 */
export const jwtConfig = {
  secret: envConfig.jwt.secret,
  expiresIn: envConfig.jwt.expiresIn,
  refreshExpiresIn: envConfig.jwt.refreshExpiresIn,
  issuer: 'glit-platform',
  audience: 'glit-users',
};

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  sub: string; // user_id
  email: string;
  role: string; // 'student', 'admin_teacher', 'super_admin'
  tenant_id?: string;
  iat?: number; // Issued at
  exp?: number; // Expiration
}

/**
 * Refresh Token Payload Interface
 */
export interface RefreshTokenPayload {
  sub: string; // user_id
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export default jwtConfig;
