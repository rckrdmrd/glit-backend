/**
 * Validation Middleware
 *
 * Request validation using Joi schemas.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ErrorCode } from '../shared/types';

/**
 * Validate Request Middleware
 *
 * Validates request body, params, or query against Joi schema.
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
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
