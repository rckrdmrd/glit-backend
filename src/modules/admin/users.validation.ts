/**
 * Users Validation
 *
 * Validation schemas for user management endpoints.
 */

import Joi from 'joi';

/**
 * List Users Query Validation
 */
export const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sort_by: Joi.string()
    .valid('created_at', 'updated_at', 'email', 'last_sign_in_at', 'full_name')
    .default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),

  // Filters
  role: Joi.string().valid('student', 'admin_teacher', 'super_admin'),
  status: Joi.string().valid('active', 'suspended', 'banned', 'deleted'),
  tenant_id: Joi.string().uuid(),
  search: Joi.string().max(255),
  created_after: Joi.date().iso(),
  created_before: Joi.date().iso(),
  last_login_after: Joi.date().iso(),
  last_login_before: Joi.date().iso(),
});

/**
 * User ID Param Validation
 */
export const userIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
});

/**
 * Update User Body Validation
 */
export const updateUserBodySchema = Joi.object({
  email: Joi.string().email().max(255).messages({
    'string.email': 'Invalid email format',
  }),
  full_name: Joi.string().max(255).allow(null, ''),
  first_name: Joi.string().max(100).allow(null, ''),
  last_name: Joi.string().max(100).allow(null, ''),
  display_name: Joi.string().max(100).allow(null, ''),
  role: Joi.string().valid('student', 'admin_teacher', 'super_admin'),
  tenant_id: Joi.string().uuid().allow(null),
  phone: Joi.string().max(20).allow(null, ''),
  student_id: Joi.string().max(50).allow(null, ''),
  grade_level: Joi.string().max(20).allow(null, ''),
  is_active: Joi.boolean(),
  avatar_url: Joi.string().uri().max(500).allow(null, ''),
  bio: Joi.string().max(1000).allow(null, ''),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Suspend User Body Validation
 */
export const suspendUserBodySchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    'any.required': 'Suspension reason is required',
    'string.min': 'Reason must be at least 10 characters',
    'string.max': 'Reason must not exceed 500 characters',
  }),
  duration_days: Joi.number().integer().min(1).max(3650).messages({
    'number.base': 'Duration must be a number',
    'number.min': 'Duration must be at least 1 day',
    'number.max': 'Duration cannot exceed 10 years',
  }),
});

/**
 * Force Password Reset Body Validation
 */
export const forcePasswordResetBodySchema = Joi.object({
  reason: Joi.string().max(500),
  notify_user: Joi.boolean().default(true),
});

/**
 * User Activity Query Validation
 */
export const userActivityQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500).default(50),
});

/**
 * Validate Request
 *
 * Generic validation function for request data.
 *
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws Validation error if data is invalid
 */
export function validateRequest<T>(schema: Joi.Schema, data: any): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    };
  }

  return value as T;
}
