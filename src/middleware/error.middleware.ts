/**
 * Error Handling Middleware
 *
 * Centralized error handling for Express application.
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../shared/utils/logger';
import { ErrorCode } from '../shared/types';

/**
 * Custom Application Error
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error Handler Middleware
 *
 * Catches all errors and sends appropriate response.
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let code: string = ErrorCode.INTERNAL_ERROR;
  let message = 'Internal server error';

  // Handle AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = ErrorCode.VALIDATION_ERROR;
    message = err.message;
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    code = ErrorCode.UNAUTHORIZED;
    message = 'Unauthorized access';
  }

  // Log error
  if (statusCode >= 500) {
    log.error('Internal server error:', err);
  } else {
    log.warn(`Error ${statusCode}: ${message}`);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * Not Found Handler
 *
 * Handles 404 errors for undefined routes.
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

/**
 * Async Handler Wrapper
 *
 * Wraps async route handlers to catch errors.
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
