/**
 * Authentication Middleware
 *
 * JWT authentication middleware for protected routes.
 * Verifies JWT tokens and attaches user information to request.
 * Validates user is_active status and suspension state on every request.
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig, JWTPayload } from '../config/jwt';
import { AuthRequest, ErrorCode } from '../shared/types';
import { log } from '../shared/utils/logger';
import { pool } from '../database/pool';

/**
 * Authenticate JWT Token Middleware
 *
 * Extracts and verifies JWT token from Authorization header.
 * Attaches decoded user information to request object.
 * Validates user account is active and not suspended on every authenticated request.
 */
export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Token not provided',
        },
      });
      return;
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);

    // Verify token
    const payload = jwt.verify(token, jwtConfig.secret) as JWTPayload;

    // Check user's current active status in database
    // This ensures that even with a valid token, deactivated users cannot access resources
    const userStatusResult = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.role,
        u.deleted_at,
        p.status
      FROM auth.users u
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [payload.sub]
    );

    const user = userStatusResult.rows[0];

    // User not found or deleted
    if (!user || user.deleted_at) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.ACCOUNT_INACTIVE,
          message: 'Account is inactive',
        },
      });
      return;
    }

    // Check if account is active (status field from profiles table)
    // Status can be: 'active', 'inactive', 'suspended', 'pending'
    if (user.status && user.status !== 'active') {
      const message = user.status === 'suspended'
        ? 'Your account has been suspended. Please contact support for assistance.'
        : 'Your account has been deactivated. Please contact support for assistance.';

      res.status(401).json({
        success: false,
        error: {
          code: user.status === 'suspended' ? ErrorCode.ACCOUNT_SUSPENDED : ErrorCode.ACCOUNT_INACTIVE,
          message,
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenant_id: payload.tenant_id,
    };

    log.debug(`User authenticated: ${req.user.email} (${req.user.id})`);

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Invalid token',
        },
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.TOKEN_EXPIRED,
          message: 'Token expired',
        },
      });
      return;
    }

    log.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication failed',
      },
    });
  }
};

/**
 * Require Specific Role Middleware
 *
 * Verifies that authenticated user has one of the required roles.
 *
 * @param roles - Array of allowed roles
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Not authenticated',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      log.warn(
        `Access denied for user ${req.user.email} with role ${req.user.role}. Required: ${roles.join(', ')}`
      );

      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 *
 * Attempts to authenticate user but doesn't fail if no token provided.
 * Useful for endpoints that work both authenticated and unauthenticated.
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, jwtConfig.secret) as JWTPayload;

      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tenant_id: payload.tenant_id,
      };
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};
