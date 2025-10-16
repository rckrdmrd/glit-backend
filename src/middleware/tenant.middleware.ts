/**
 * Tenant Middleware
 *
 * Extracts and validates tenant context for multi-tenancy support.
 * Ensures all requests are scoped to a specific tenant.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../shared/types';
import { log } from '../shared/utils/logger';

/**
 * Extended AuthRequest with tenant context
 */
export interface TenantRequest extends AuthRequest {
  tenantId?: string;
}

/**
 * Extract Tenant Context Middleware
 *
 * Extracts tenant_id from:
 * 1. x-tenant-id header
 * 2. Authenticated user's tenant_id
 * 3. Query parameter tenant_id (for admin operations)
 *
 * Attaches tenantId to request object for downstream use.
 */
export const extractTenantContext = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Priority 1: Header x-tenant-id
    let tenantId = req.headers['x-tenant-id'] as string;

    // Priority 2: Authenticated user's tenant_id
    if (!tenantId && req.user?.tenant_id) {
      tenantId = req.user.tenant_id;
    }

    // Priority 3: Query parameter (for admin only)
    if (!tenantId && req.query.tenant_id && req.user?.role === 'super_admin') {
      tenantId = req.query.tenant_id as string;
    }

    // Attach to request
    if (tenantId) {
      req.tenantId = tenantId;
      log.debug(`Tenant context set: ${tenantId}`);
    }

    next();
  } catch (error) {
    log.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_ERROR',
        message: 'Failed to establish tenant context',
      },
    });
  }
};

/**
 * Require Tenant Middleware
 *
 * Ensures a tenant_id is present in the request.
 * Returns 400 if tenant_id is missing.
 */
export const requireTenant = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.tenantId) {
    log.warn('Request missing tenant_id');
    res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'Tenant ID is required for this operation',
      },
    });
    return;
  }

  next();
};

/**
 * Optional Tenant Middleware
 *
 * Extracts tenant context but doesn't require it.
 * Useful for endpoints that work with or without tenant scope.
 */
export const optionalTenant = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  extractTenantContext(req, res, next);
};

/**
 * Validate Tenant Access Middleware
 *
 * Ensures user has access to the requested tenant.
 * Super admins can access all tenants.
 */
export const validateTenantAccess = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Super admins can access any tenant
    if (req.user?.role === 'super_admin') {
      return next();
    }

    // Regular users must match tenant_id
    if (req.tenantId && req.user?.tenant_id !== req.tenantId) {
      log.warn(
        `User ${req.user?.email} attempted to access tenant ${req.tenantId} but belongs to ${req.user?.tenant_id}`
      );

      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: 'Access to this tenant is not authorized',
        },
      });
      return;
    }

    next();
  } catch (error) {
    log.error('Tenant access validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_VALIDATION_ERROR',
        message: 'Failed to validate tenant access',
      },
    });
  }
};
