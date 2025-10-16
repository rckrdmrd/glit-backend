/**
 * Admin Validation
 *
 * Common validation schemas for admin module.
 */

import Joi from 'joi';

/**
 * Pagination Query Validation
 */
export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sort_by: Joi.string().default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * UUID Parameter Validation
 */
export const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid ID format',
    'any.required': 'ID is required',
  }),
});

/**
 * Date Range Query Validation
 */
export const dateRangeQuerySchema = Joi.object({
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso().min(Joi.ref('date_from')).messages({
    'date.min': 'date_to must be after date_from',
  }),
});

/**
 * Admin Actions Log Query Validation
 */
export const adminActionsLogQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  admin_id: Joi.string().uuid(),
  action: Joi.string().max(100),
  target_type: Joi.string().max(50),
  status: Joi.string().valid('success', 'failure'),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso().min(Joi.ref('date_from')),
});

/**
 * System Metrics Query Validation
 */
export const systemMetricsQuerySchema = Joi.object({
  time_range: Joi.string()
    .valid('5m', '15m', '1h', '6h', '24h', '7d', '30d')
    .default('1h'),
});

/**
 * System Logs Query Validation
 */
export const systemLogsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(500).default(100),
  level: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal'),
  service: Joi.string().max(100),
  module: Joi.string().max(100),
  user_id: Joi.string().uuid(),
  search: Joi.string().max(255),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso().min(Joi.ref('date_from')),
});

/**
 * Validate Request Helper
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
