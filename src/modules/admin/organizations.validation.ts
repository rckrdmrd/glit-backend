/**
 * Organizations Validation
 *
 * Request validation schemas for organization endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../../shared/utils/logger';

/**
 * Validate Create Organization Request
 */
export const validateCreateOrganization = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, slug, subscription_tier, max_users, max_storage_gb } = req.body;

  const errors: string[] = [];

  // Required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    errors.push('Slug is required and must be a non-empty string');
  }

  // Slug format validation
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  // Optional field validation
  if (subscription_tier && !['free', 'basic', 'professional', 'enterprise'].includes(subscription_tier)) {
    errors.push('Invalid subscription_tier. Must be: free, basic, professional, or enterprise');
  }

  if (max_users !== undefined) {
    if (typeof max_users !== 'number' || max_users < 1) {
      errors.push('max_users must be a positive number');
    }
  }

  if (max_storage_gb !== undefined) {
    if (typeof max_storage_gb !== 'number' || max_storage_gb < 1) {
      errors.push('max_storage_gb must be a positive number');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors,
      },
    });
    return;
  }

  next();
};

/**
 * Validate Update Organization Request
 */
export const validateUpdateOrganization = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, subscription_tier, max_users, max_storage_gb, is_active } = req.body;

  const errors: string[] = [];

  // At least one field must be present
  if (!name && !subscription_tier && max_users === undefined && max_storage_gb === undefined && is_active === undefined) {
    errors.push('At least one field must be provided for update');
  }

  // Optional field validation
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    errors.push('Name must be a non-empty string');
  }

  if (subscription_tier && !['free', 'basic', 'professional', 'enterprise'].includes(subscription_tier)) {
    errors.push('Invalid subscription_tier. Must be: free, basic, professional, or enterprise');
  }

  if (max_users !== undefined && (typeof max_users !== 'number' || max_users < 1)) {
    errors.push('max_users must be a positive number');
  }

  if (max_storage_gb !== undefined && (typeof max_storage_gb !== 'number' || max_storage_gb < 1)) {
    errors.push('max_storage_gb must be a positive number');
  }

  if (is_active !== undefined && typeof is_active !== 'boolean') {
    errors.push('is_active must be a boolean');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors,
      },
    });
    return;
  }

  next();
};

/**
 * Validate Update Subscription Request
 */
export const validateUpdateSubscription = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { subscription_tier } = req.body;

  const errors: string[] = [];

  if (!subscription_tier) {
    errors.push('subscription_tier is required');
  }

  if (subscription_tier && !['free', 'basic', 'professional', 'enterprise'].includes(subscription_tier)) {
    errors.push('Invalid subscription_tier. Must be: free, basic, professional, or enterprise');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors,
      },
    });
    return;
  }

  next();
};

/**
 * Validate Update Feature Flags Request
 */
export const validateUpdateFeatureFlags = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { features } = req.body;

  const errors: string[] = [];

  if (!features || typeof features !== 'object') {
    errors.push('features is required and must be an object');
  }

  if (features) {
    const validFeatures = [
      'ai_features',
      'social_features',
      'advanced_analytics',
      'custom_branding',
      'api_access',
      'gamification_enabled',
      'social_features_enabled',
      'analytics_enabled',
    ];

    Object.entries(features).forEach(([key, value]) => {
      if (!validFeatures.includes(key)) {
        errors.push(`Invalid feature flag: ${key}`);
      }

      if (typeof value !== 'boolean') {
        errors.push(`Feature flag ${key} must be a boolean`);
      }
    });

    if (Object.keys(features).length === 0) {
      errors.push('At least one feature flag must be provided');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors,
      },
    });
    return;
  }

  next();
};

/**
 * Validate UUID Parameter
 */
export const validateUuidParam = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuid || !uuidRegex.test(uuid)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid ${paramName} format. Must be a valid UUID`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Validate Pagination Parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { page, limit } = req.query;

  const errors: string[] = [];

  if (page !== undefined) {
    const pageNum = parseInt(page as string);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('page must be a positive integer');
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('limit must be a positive integer between 1 and 100');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid pagination parameters',
        details: errors,
      },
    });
    return;
  }

  next();
};
