/**
 * Validation Middleware
 *
 * Request validation using Joi schemas.
 * Provides centralized validation and consistent error handling.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ErrorCode } from '../shared/types';

/**
 * Default Joi validation options
 */
const defaultValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,      // Return all errors, not just the first
  stripUnknown: true,     // Remove unknown fields
  convert: true,          // Auto-convert types
  allowUnknown: false,    // Don't allow additional fields
};

/**
 * Validate Request Middleware
 *
 * Validates request body, params, or query against Joi schema.
 *
 * @param schema - Joi schema to validate against
 * @param property - Request property to validate ('body', 'params', or 'query')
 * @param options - Optional Joi validation options
 *
 * @example
 * ```typescript
 * import { validate } from '@/middleware/validation.middleware';
 * import { registerSchema } from '@/modules/auth/validations/auth.validation';
 *
 * router.post('/register', validate(registerSchema), authController.register);
 * router.get('/users/:id', validate(userIdSchema, 'params'), usersController.getUser);
 * ```
 */
export const validate = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'params' | 'query' = 'body',
  options?: Joi.ValidationOptions
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationOptions = { ...defaultValidationOptions, ...options };

    const { error, value } = schema.validate(req[property], validationOptions);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errors,
        },
      });
      return;
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

/**
 * Validate body shorthand
 */
export const validateBody = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) =>
  validate(schema, 'body', options);

/**
 * Validate query shorthand
 */
export const validateQuery = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) =>
  validate(schema, 'query', options);

/**
 * Validate params shorthand
 */
export const validateParams = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) =>
  validate(schema, 'params', options);
