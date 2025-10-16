/**
 * Authentication Middleware
 *
 * JWT authentication middleware for protected routes.
 * Verifies JWT tokens and attaches user information to request.
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig, JWTPayload } from '../config/jwt';
import { AuthRequest, ErrorCode } from '../shared/types';
import { log } from '../shared/utils/logger';

/**
 * Authenticate JWT Token Middleware
 *
 * Extracts and verifies JWT token from Authorization header.
 * Attaches decoded user information to request object.
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
