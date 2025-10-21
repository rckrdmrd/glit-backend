/**
 * Auth Module Joi Validation Schemas
 * 
 * Centralized validation schemas for authentication endpoints
 * using Joi for request validation.
 */

import Joi from 'joi';

/**
 * Common validation patterns
 */
const emailPattern = Joi.string()
  .email()
  .lowercase()
  .trim()
  .max(255)
  .required()
  .messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  });

const passwordPattern = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  });

/**
 * Register validation schema
 */
export const registerSchema = Joi.object({
  email: emailPattern,
  password: passwordPattern,
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name must not exceed 100 characters',
    }),
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 1 character',
      'string.max': 'Last name must not exceed 100 characters',
    }),
  role: Joi.string()
    .valid('student', 'admin_teacher', 'super_admin')
    .default('student')
    .messages({
      'any.only': 'Role must be one of: student, admin_teacher, super_admin',
    }),
  tenantId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Tenant ID must be a valid UUID',
    }),
});

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  email: emailPattern,
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
  rememberMe: Joi.boolean()
    .optional()
    .default(false),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
});

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = Joi.object({
  email: emailPattern,
});

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required',
      'any.required': 'Reset token is required',
    }),
  newPassword: passwordPattern,
});

/**
 * Update password validation schema
 */
export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required',
    }),
  newPassword: passwordPattern,
});

/**
 * Verify email validation schema
 */
export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Verification token is required',
      'any.required': 'Verification token is required',
    }),
});

/**
 * Update profile validation schema
 */
export const updateProfileSchema = Joi.object({
  displayName: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Display name must be at least 1 character',
      'string.max': 'Display name must not exceed 200 characters',
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Avatar must be a valid URL',
    }),
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format',
    }),
  dateOfBirth: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Date of birth cannot be in the future',
    }),
  gradeLevel: Joi.string()
    .max(50)
    .optional(),
});

/**
 * Session ID validation schema
 */
export const sessionIdSchema = Joi.object({
  sessionId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Session ID must be a valid UUID',
      'any.required': 'Session ID is required',
    }),
});

export default {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  sessionIdSchema,
};
