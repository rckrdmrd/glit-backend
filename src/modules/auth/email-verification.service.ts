/**
 * Email Verification Service
 *
 * Handles email verification functionality including token generation,
 * validation, and user verification status updates.
 */

import crypto from 'crypto';
import { Pool } from 'pg';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  email: string;
  token_hash: string;
  expires_at: Date;
  verified_at: Date | null;
  created_at: Date;
}

export class EmailVerificationService {
  // Token expiration: 48 hours
  private readonly TOKEN_EXPIRATION_HOURS = 48;
  private readonly MAX_RESEND_ATTEMPTS_PER_HOUR = 3;

  constructor(private pool: Pool) {}

  /**
   * Send email verification token
   * Called during registration or when user requests resend
   *
   * @param userId - User ID
   * @param email - Email address to verify
   */
  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if email is already verified
      const profileResult = await client.query(
        'SELECT email_verified FROM auth_management.profiles WHERE id = $1',
        [userId]
      );

      if (profileResult.rows.length > 0 && profileResult.rows[0].email_verified) {
        throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Check rate limiting
      const recentTokens = await client.query(
        `SELECT COUNT(*) as count FROM auth_management.email_verification_tokens
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId]
      );

      if (parseInt(recentTokens.rows[0].count) >= this.MAX_RESEND_ATTEMPTS_PER_HOUR) {
        throw new AppError(
          'Too many verification email requests. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Store hashed token in database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRATION_HOURS);

      await client.query(
        `INSERT INTO auth_management.email_verification_tokens
         (user_id, email, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, email.toLowerCase(), tokenHash, expiresAt]
      );

      await client.query('COMMIT');

      // In production, send email with verification link
      // For now, just log to console
      const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
      log.info(`
========================================
EMAIL VERIFICATION (Mock)
========================================
To: ${email}
Subject: Verify Your Email Address

Hello,

Welcome to GLIT Platform! Please verify your email address by clicking the link below:

${verificationLink}

This link will expire in ${this.TOKEN_EXPIRATION_HOURS} hours.

If you didn't create this account, please ignore this email.
========================================
      `);

      log.info(`Email verification token sent to: ${email}`);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error sending verification email:', error);
      throw new AppError('Failed to send verification email', 500, ErrorCode.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  }

  /**
   * Verify email using token
   *
   * @param token - Verification token from email
   */
  async verifyEmail(token: string): Promise<{ email: string; userId: string }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Hash the provided token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid token
      const tokenResult = await client.query(
        `SELECT * FROM auth_management.email_verification_tokens
         WHERE token_hash = $1
           AND expires_at > NOW()
           AND verified_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        await client.query('COMMIT');
        throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
      }

      const verificationToken = tokenResult.rows[0];

      // Mark email as verified in profiles table
      await client.query(
        `UPDATE auth_management.profiles
         SET email_verified = true, updated_at = NOW()
         WHERE id = $1`,
        [verificationToken.user_id]
      );

      // Also update email_confirmed_at in auth.users if it exists
      await client.query(
        `UPDATE auth.users
         SET email_confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND email_confirmed_at IS NULL`,
        [verificationToken.user_id]
      );

      // Mark token as used
      await client.query(
        `UPDATE auth_management.email_verification_tokens
         SET verified_at = NOW()
         WHERE id = $1`,
        [verificationToken.id]
      );

      await client.query('COMMIT');

      log.info(`Email verified for user: ${verificationToken.user_id} (${verificationToken.email})`);

      // In production, send welcome email
      log.info(`
========================================
EMAIL VERIFIED CONFIRMATION (Mock)
========================================
To: ${verificationToken.email}
Subject: Email Verified Successfully

Hello,

Your email has been verified successfully! You now have full access to GLIT Platform.

Welcome aboard!
========================================
      `);

      return {
        email: verificationToken.email,
        userId: verificationToken.user_id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error verifying email:', error);
      throw new AppError('Failed to verify email', 500, ErrorCode.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  }

  /**
   * Resend verification email
   *
   * @param userId - User ID
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    try {
      // Get user email
      const userResult = await this.pool.query(
        `SELECT u.id, u.email, p.email_verified
         FROM auth.users u
         LEFT JOIN auth_management.profiles p ON p.id = u.id
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      const user = userResult.rows[0];

      if (user.email_verified) {
        throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Send new verification email
      await this.sendVerificationEmail(userId, user.email);

      log.info(`Verification email resent to: ${user.email}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error resending verification email:', error);
      throw new AppError('Failed to resend verification email', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Check if user's email is verified
   *
   * @param userId - User ID
   * @returns True if email is verified
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT email_verified FROM auth_management.profiles WHERE id = $1',
        [userId]
      );

      return result.rows.length > 0 && result.rows[0].email_verified === true;
    } catch (error) {
      log.error('Error checking email verification status:', error);
      return false;
    }
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.pool.query(
        `DELETE FROM auth_management.email_verification_tokens
         WHERE expires_at < NOW() - INTERVAL '7 days'`
      );

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        log.info(`Cleaned up ${deletedCount} expired email verification tokens`);
      }

      return deletedCount;
    } catch (error) {
      log.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}
