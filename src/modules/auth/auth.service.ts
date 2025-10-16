/**
 * Authentication Service
 *
 * Business logic for authentication operations.
 * Implements Service Pattern for authentication workflows.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';
import { RegisterDto, LoginDto, AuthResponse } from './auth.types';
import { jwtConfig, JWTPayload, RefreshTokenPayload } from '../../config/jwt';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import { SessionManagementService } from './session-management.service';

export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private sessionManagementService?: SessionManagementService
  ) {}

  /**
   * Register new user
   *
   * @param registerDto - Registration data
   * @returns Authentication response with token
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.authRepository.findUserByEmail(registerDto.email);

      if (existingUser) {
        throw new AppError('Email already registered', 409, ErrorCode.EMAIL_EXISTS);
      }

      // Validate password strength
      if (!this.isPasswordStrong(registerDto.password)) {
        throw new AppError(
          'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number',
          400,
          ErrorCode.WEAK_PASSWORD
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Create user
      const user = await this.authRepository.createUser({
        email: registerDto.email,
        password: hashedPassword,
        role: registerDto.role || 'student',
        metadata: {
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          fullName: registerDto.firstName && registerDto.lastName
            ? `${registerDto.firstName} ${registerDto.lastName}`
            : null,
          displayName: registerDto.firstName || registerDto.email.split('@')[0],
        },
      });

      // Generate tokens
      const token = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      log.info(`User registered successfully: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          displayName: registerDto.firstName || user.email.split('@')[0],
        },
        token,
        refreshToken,
        expiresIn: jwtConfig.expiresIn,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Registration error:', error);
      throw new AppError('Registration failed', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Login user
   *
   * @param loginDto - Login credentials
   * @param userAgent - User agent string (optional)
   * @param ipAddress - IP address (optional)
   * @returns Authentication response with token
   */
  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.authRepository.findUserByEmail(loginDto.email);

      if (!user) {
        throw new AppError('Invalid credentials', 401, ErrorCode.INVALID_CREDENTIALS);
      }

      // Check if account is active (not deleted)
      if (user.deleted_at) {
        throw new AppError('Account is inactive', 403, ErrorCode.ACCOUNT_INACTIVE);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.encrypted_password);

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401, ErrorCode.INVALID_CREDENTIALS);
      }

      // Update last sign in timestamp
      await this.authRepository.updateLastSignIn(user.id);

      // Get user profile
      const profile = await this.authRepository.getUserProfile(user.id);

      // Generate tokens
      const token = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Create session if SessionManagementService is available
      if (this.sessionManagementService) {
        try {
          await this.sessionManagementService.createSession(
            user.id,
            token,
            refreshToken,
            userAgent || null,
            ipAddress || null
          );
        } catch (sessionError) {
          // Log error but don't fail login if session creation fails
          log.error('Failed to create session:', sessionError);
        }
      }

      log.info(`User logged in: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: profile?.first_name,
          lastName: profile?.last_name,
          displayName: profile?.display_name || user.email.split('@')[0],
        },
        token,
        refreshToken,
        expiresIn: jwtConfig.expiresIn,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Login error:', error);
      throw new AppError('Login failed', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Refresh access token
   *
   * @param refreshToken - Refresh token
   * @returns New access token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; expiresIn: string }> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, jwtConfig.secret) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        throw new AppError('Invalid refresh token', 401, ErrorCode.INVALID_TOKEN);
      }

      // Get user
      const user = await this.authRepository.findUserById(payload.sub);

      if (!user || user.deleted_at) {
        throw new AppError('User not found or inactive', 401, ErrorCode.INVALID_TOKEN);
      }

      // Generate new access token
      const newToken = this.generateAccessToken(user);

      log.info(`Token refreshed for user: ${user.email}`);

      return {
        token: newToken,
        expiresIn: jwtConfig.expiresIn,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expired', 401, ErrorCode.TOKEN_EXPIRED);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401, ErrorCode.INVALID_TOKEN);
      }
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Refresh token error:', error);
      throw new AppError('Token refresh failed', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get user profile by ID
   *
   * @param userId - User ID
   * @returns User profile data
   */
  async getUserProfile(userId: string) {
    try {
      const user = await this.authRepository.findUserById(userId);

      if (!user) {
        throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      const profile = await this.authRepository.getUserProfile(userId);

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        displayName: profile?.display_name,
        avatarUrl: profile?.avatar_url,
        createdAt: user.created_at,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Get profile error:', error);
      throw new AppError('Failed to get profile', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Update user password
   *
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.authRepository.findUserById(userId);

      if (!user) {
        throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.encrypted_password);

      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
      }

      // Validate new password strength
      if (!this.isPasswordStrong(newPassword)) {
        throw new AppError(
          'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number',
          400,
          ErrorCode.WEAK_PASSWORD
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.authRepository.updatePassword(userId, hashedPassword);

      log.info(`Password updated for user: ${user.email}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Update password error:', error);
      throw new AppError('Failed to update password', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Generate JWT access token
   *
   * @param user - User object
   * @returns JWT token string
   */
  private generateAccessToken(user: { id: string; email: string; role: string }): string {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn as any,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    } as jwt.SignOptions);
  }

  /**
   * Generate JWT refresh token
   *
   * @param user - User object
   * @returns Refresh token string
   */
  private generateRefreshToken(user: { id: string }): string {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
    };

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.refreshExpiresIn as any,
      issuer: jwtConfig.issuer,
    } as jwt.SignOptions);
  }

  /**
   * Validate password strength
   *
   * @param password - Password string
   * @returns True if password is strong enough
   */
  private isPasswordStrong(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  }
}
