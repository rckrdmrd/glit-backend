/**
 * Admin Middleware
 *
 * Authorization and audit logging for admin operations.
 * Ensures only super_admin users can access admin endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest, ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import { AuditService } from './audit.service';
import { pool } from '../../database/pool';

/**
 * Require Super Admin Role Middleware
 *
 * Verifies that the authenticated user has super_admin role.
 * Logs unauthorized access attempts.
 */
export const requireSuperAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    if (req.user.role !== 'super_admin') {
      // Log unauthorized admin access attempt
      const auditService = new AuditService(pool);
      await auditService.logEvent({
        event_type: 'unauthorized_admin_access',
        action: 'access_denied',
        actor_id: req.user.id,
        actor_type: 'user',
        actor_ip: req.ip,
        actor_user_agent: req.headers['user-agent'],
        severity: 'warning',
        status: 'failure',
        description: `User ${req.user.email} (${req.user.role}) attempted to access admin endpoint: ${req.method} ${req.path}`,
        additional_data: {
          endpoint: req.path,
          method: req.method,
          user_role: req.user.role,
        },
      });

      log.warn(
        `Unauthorized admin access attempt by ${req.user.email} (${req.user.role}) to ${req.method} ${req.path}`
      );

      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Super admin access required',
        },
      });
      return;
    }

    // Log successful admin access
    log.debug(`Admin access granted to ${req.user.email} for ${req.method} ${req.path}`);

    next();
  } catch (error) {
    log.error('Admin authorization error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Authorization check failed',
      },
    });
  }
};

/**
 * Require Admin Role Middleware
 *
 * Verifies that the authenticated user has super_admin or admin_teacher role.
 * Logs unauthorized access attempts.
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    const allowedRoles = ['super_admin', 'admin_teacher'];
    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized admin access attempt
      const auditService = new AuditService(pool);
      await auditService.logEvent({
        event_type: 'unauthorized_admin_access',
        action: 'access_denied',
        actor_id: req.user.id,
        actor_type: 'user',
        actor_ip: req.ip,
        actor_user_agent: req.headers['user-agent'],
        severity: 'warning',
        status: 'failure',
        description: `User ${req.user.email} (${req.user.role}) attempted to access admin endpoint: ${req.method} ${req.path}`,
        additional_data: {
          endpoint: req.path,
          method: req.method,
          user_role: req.user.role,
        },
      });

      log.warn(
        `Unauthorized admin access attempt by ${req.user.email} (${req.user.role}) to ${req.method} ${req.path}`
      );

      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Admin access required (super_admin or admin_teacher)',
        },
      });
      return;
    }

    // Log successful admin access
    log.debug(`Admin access granted to ${req.user.email} for ${req.method} ${req.path}`);

    next();
  } catch (error) {
    log.error('Admin authorization error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Authorization check failed',
      },
    });
  }
};

/**
 * Admin Action Audit Middleware
 *
 * Logs all admin actions to audit trail.
 * Captures request/response details for compliance.
 */
export const auditAdminAction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const auditService = new AuditService(pool);
  const startTime = Date.now();

  // Capture original response methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let responseBody: any;
  let statusCode: number;

  // Intercept response
  res.json = function (body: any): Response {
    responseBody = body;
    statusCode = res.statusCode;
    return originalJson(body);
  };

  res.send = function (body: any): Response {
    responseBody = body;
    statusCode = res.statusCode;
    return originalSend(body);
  };

  // Log after response is sent
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;

      await auditService.logEvent({
        event_type: 'admin_action',
        action: `${req.method}_${req.path.replace(/\//g, '_')}`,
        resource_type: extractResourceType(req.path),
        resource_id: extractResourceId(req.path),
        actor_id: req.user?.id,
        actor_type: 'user',
        actor_ip: req.ip,
        actor_user_agent: req.headers['user-agent'],
        severity: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'info',
        status: statusCode >= 200 && statusCode < 300 ? 'success' : 'failure',
        description: `Admin ${req.method} ${req.path} - ${statusCode}`,
        additional_data: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: sanitizeRequestBody(req.body),
          status_code: statusCode,
          duration_ms: duration,
          response: sanitizeResponse(responseBody),
        },
      });
    } catch (error) {
      log.error('Failed to log admin action:', error);
    }
  });

  next();
};

/**
 * Rate Limiting for Admin Endpoints
 *
 * Implements strict rate limiting for admin operations.
 * 5 requests per minute per admin user.
 */
const adminRateLimits = new Map<string, { count: number; resetAt: number }>();

export const adminRateLimit = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next();
  }

  const userId = req.user.id;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  const userLimit = adminRateLimits.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Reset window
    adminRateLimits.set(userId, {
      count: 1,
      resetAt: now + windowMs,
    });
    return next();
  }

  if (userLimit.count >= maxRequests) {
    log.warn(`Rate limit exceeded for admin user ${req.user.email}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many admin requests. Please try again later.',
        details: {
          limit: maxRequests,
          windowMs,
          resetAt: new Date(userLimit.resetAt).toISOString(),
        },
      },
    });
    return;
  }

  userLimit.count++;
  next();
};

/**
 * Helper Functions
 */

function extractResourceType(path: string): string | undefined {
  const match = path.match(/\/api\/admin\/(\w+)/);
  return match ? match[1] : undefined;
}

function extractResourceId(path: string): string | undefined {
  const match = path.match(/\/([a-f0-9-]{36})\/?/i);
  return match ? match[1] : undefined;
}

function sanitizeRequestBody(body: any): any {
  if (!body) return undefined;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'encrypted_password'];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

function sanitizeResponse(response: any): any {
  if (!response) return undefined;

  // Only log first 500 chars of response
  const str = JSON.stringify(response);
  if (str.length > 500) {
    return str.substring(0, 500) + '... [truncated]';
  }

  return response;
}
