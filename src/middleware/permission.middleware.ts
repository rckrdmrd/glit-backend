/**
 * Permission Middleware
 *
 * Middleware for checking user permissions before allowing access to routes.
 * Implements granular permission checking based on the permission system.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest, ErrorCode } from '../shared/types';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../modules/auth/auth.permissions';
import { log } from '../shared/utils/logger';

/**
 * Require specific permission middleware
 *
 * Checks if the authenticated user has the required permission.
 *
 * @param permission - Required permission string
 */
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
      return;
    }

    // Check if user has the required permission
    if (!hasPermission(req.user.role, permission)) {
      log.warn(
        `Permission denied: User ${req.user.email} (${req.user.role}) attempted to access resource requiring '${permission}'`
      );

      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Insufficient permissions',
          details: {
            required: permission,
            userRole: req.user.role,
          },
        },
      });
      return;
    }

    next();
  };
};

/**
 * Require any of the specified permissions
 *
 * User needs at least one of the listed permissions to proceed.
 *
 * @param permissions - Array of permission strings
 */
export const requireAnyPermission = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
      return;
    }

    // Check if user has any of the required permissions
    if (!hasAnyPermission(req.user.role, permissions)) {
      log.warn(
        `Permission denied: User ${req.user.email} (${req.user.role}) attempted to access resource requiring any of: ${permissions.join(', ')}`
      );

      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Insufficient permissions',
          details: {
            requiredAny: permissions,
            userRole: req.user.role,
          },
        },
      });
      return;
    }

    next();
  };
};

/**
 * Require all of the specified permissions
 *
 * User needs all listed permissions to proceed.
 *
 * @param permissions - Array of permission strings
 */
export const requireAllPermissions = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
      return;
    }

    // Check if user has all of the required permissions
    if (!hasAllPermissions(req.user.role, permissions)) {
      log.warn(
        `Permission denied: User ${req.user.email} (${req.user.role}) attempted to access resource requiring all of: ${permissions.join(', ')}`
      );

      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Insufficient permissions',
          details: {
            requiredAll: permissions,
            userRole: req.user.role,
          },
        },
      });
      return;
    }

    next();
  };
};

/**
 * Require resource ownership or admin access
 *
 * Allows access if user owns the resource OR has admin permissions.
 *
 * @param resourceUserIdGetter - Function to extract resource owner ID from request
 * @param adminPermission - Permission that grants admin access to all resources
 */
export const requireOwnershipOrPermission = (
  resourceUserIdGetter: (req: AuthRequest) => string | undefined,
  adminPermission: string
) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
      return;
    }

    // Get resource owner ID
    const resourceUserId = resourceUserIdGetter(req);

    // Check if user owns the resource
    const isOwner = resourceUserId && req.user.id === resourceUserId;

    // Check if user has admin permission
    const hasAdminPermission = hasPermission(req.user.role, adminPermission);

    if (!isOwner && !hasAdminPermission) {
      log.warn(
        `Access denied: User ${req.user.email} attempted to access resource owned by ${resourceUserId}`
      );

      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Access denied: You can only access your own resources',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Check permissions and add to request context
 *
 * Adds user permissions to request object for use in handlers.
 * Does not block request - only adds information.
 */
export const attachPermissions = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user) {
    // Import here to avoid circular dependency
    const { getPermissionsForRole } = require('../modules/auth/auth.permissions');
    req.userPermissions = getPermissionsForRole(req.user.role);
  }

  next();
};
