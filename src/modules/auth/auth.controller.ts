/**
 * Authentication Controller
 *
 * HTTP request handlers for authentication endpoints.
 * Implements Controller Pattern for request/response handling.
 */

import { Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './auth.types';
import { AuthRequest } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import { PasswordRecoveryService } from './password-recovery.service';
import { EmailVerificationService } from './email-verification.service';
import { SessionManagementService } from './session-management.service';
import { SecurityService } from './security.service';

export class AuthController {
  constructor(
    private authService: AuthService,
    private passwordRecoveryService: PasswordRecoveryService,
    private emailVerificationService: EmailVerificationService,
    private sessionManagementService: SessionManagementService,
    private securityService: SecurityService
  ) {}

  /**
   * Register new user
   *
   * POST /api/auth/register
   *
   * Creates a new user account with email_verified = true by default.
   * No email verification step required - users can immediately access the platform.
   * Returns authentication tokens for immediate login.
   */
  register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registerDto: RegisterDto = req.body;

      const result = await this.authService.register(registerDto);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   *
   * POST /api/auth/login
   */
  login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loginDto: LoginDto = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      const result = await this.authService.login(loginDto, userAgent, ipAddress);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   *
   * POST /api/auth/refresh
   */
  refreshToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
          },
        });
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   *
   * GET /api/auth/me
   * Requires authentication
   */
  me = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const profile = await this.authService.getUserProfile(req.user.id);

      res.json({
        success: true,
        data: {
          user: profile,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update password
   *
   * PUT /api/auth/password
   * Requires authentication
   */
  updatePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current password and new password are required',
          },
        });
        return;
      }

      await this.authService.updatePassword(req.user.id, currentPassword, newPassword);

      res.json({
        success: true,
        data: {
          message: 'Password updated successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user
   *
   * POST /api/auth/logout
   * Requires authentication
   */
  logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token. Here we just acknowledge the request.

      if (req.user) {
        log.info(`User logged out: ${req.user.email}`);
      }

      res.json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Request password reset
   *
   * POST /api/auth/forgot-password
   */
  forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email }: ForgotPasswordDto = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        });
        return;
      }

      const ipAddress = req.ip || 'unknown';

      await this.passwordRecoveryService.requestPasswordReset(email, ipAddress);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        data: {
          message: 'If the email exists, a password reset link has been sent',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset password with token
   *
   * POST /api/auth/reset-password
   */
  resetPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, newPassword }: ResetPasswordDto = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token and new password are required',
          },
        });
        return;
      }

      const ipAddress = req.ip || 'unknown';

      await this.passwordRecoveryService.resetPassword(token, newPassword, ipAddress);

      res.json({
        success: true,
        data: {
          message: 'Password reset successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify email with token
   *
   * POST /api/auth/verify-email
   *
   * ⚠️ DEPRECATED - Email verification is disabled
   * This endpoint is maintained for backward compatibility but is not used in the registration flow.
   * New users are created with email_verified = true by default.
   */
  verifyEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token }: VerifyEmailDto = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token is required',
          },
        });
        return;
      }

      const result = await this.emailVerificationService.verifyEmail(token);

      res.json({
        success: true,
        data: {
          message: 'Email verified successfully',
          email: result.email,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Resend verification email
   *
   * POST /api/auth/resend-verification
   * Requires authentication
   *
   * ⚠️ DEPRECATED - Email verification is disabled
   * This endpoint is maintained for backward compatibility but is not used in the registration flow.
   * New users are created with email_verified = true by default.
   */
  resendVerification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      await this.emailVerificationService.resendVerificationEmail(req.user.id);

      res.json({
        success: true,
        data: {
          message: 'Verification email sent',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user sessions
   *
   * GET /api/auth/sessions
   * Requires authentication
   */
  getSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const currentToken = req.headers.authorization?.substring(7);
      const sessions = await this.sessionManagementService.getUserSessions(req.user.id, currentToken);

      res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Revoke specific session
   *
   * DELETE /api/auth/sessions/:sessionId
   * Requires authentication
   */
  revokeSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { sessionId } = req.params;

      await this.sessionManagementService.revokeSession(req.user.id, sessionId);

      res.json({
        success: true,
        data: {
          message: 'Session revoked successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Revoke all sessions except current
   *
   * DELETE /api/auth/sessions/all
   * Requires authentication
   */
  revokeAllSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const currentToken = req.headers.authorization?.substring(7) || '';
      const revokedCount = await this.sessionManagementService.revokeAllSessionsExceptCurrent(
        req.user.id,
        currentToken
      );

      res.json({
        success: true,
        data: {
          message: `${revokedCount} session(s) revoked successfully`,
          revokedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
