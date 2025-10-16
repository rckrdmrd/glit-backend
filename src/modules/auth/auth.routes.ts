/**
 * Authentication Routes
 *
 * Route definitions for authentication endpoints.
 */

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { PasswordRecoveryService } from './password-recovery.service';
import { EmailVerificationService } from './email-verification.service';
import { SessionManagementService } from './session-management.service';
import { SecurityService } from './security.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  authRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
} from '../../middleware/rate-limit.middleware';
import Joi from 'joi';
import { pool } from '../../database/pool';

// Initialize authentication module dependencies
const authRepository = new AuthRepository(pool);
const sessionManagementService = new SessionManagementService(pool);
const authService = new AuthService(authRepository, sessionManagementService);
const passwordRecoveryService = new PasswordRecoveryService(pool);
const emailVerificationService = new EmailVerificationService(pool);
const securityService = new SecurityService(pool);
const authController = new AuthController(
  authService,
  passwordRecoveryService,
  emailVerificationService,
  sessionManagementService,
  securityService
);

// Create router
const router = Router();

/**
 * Validation schemas
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).optional(),
  lastName: Joi.string().min(2).optional(),
  role: Joi.string().valid('student', 'admin_teacher').optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});

/**
 * Public routes (no authentication required)
 */

// POST /api/auth/register - Register new user
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);

// POST /api/auth/login - Login user
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// POST /api/auth/forgot-password - Request password reset
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// POST /api/auth/verify-email - Verify email with token
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);

/**
 * Protected routes (authentication required)
 */

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateJWT, authController.me);

// PUT /api/auth/password - Update password
router.put('/password', authenticateJWT, validate(updatePasswordSchema), authController.updatePassword);

// POST /api/auth/logout - Logout user
router.post('/logout', authenticateJWT, authController.logout);

// POST /api/auth/resend-verification - Resend verification email
router.post(
  '/resend-verification',
  authenticateJWT,
  emailVerificationRateLimiter,
  authController.resendVerification
);

/**
 * Session Management Routes
 */

// GET /api/auth/sessions - Get all active sessions
router.get('/sessions', authenticateJWT, authController.getSessions);

// DELETE /api/auth/sessions/:sessionId - Revoke specific session
router.delete('/sessions/:sessionId', authenticateJWT, authController.revokeSession);

// DELETE /api/auth/sessions/all - Revoke all sessions except current
router.delete('/sessions/all', authenticateJWT, authController.revokeAllSessions);

export default router;
