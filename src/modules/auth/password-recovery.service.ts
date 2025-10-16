/**
 * Password Recovery Service
 *
 * Handles password reset functionality including token generation,
 * validation, and password updates.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export class PasswordRecoveryService {
  // Token expiration: 24 hours (as per EPIC-002 requirements, though US-002-04 says 15 minutes)
  // Using 24 hours as it's more user-friendly
  private readonly TOKEN_EXPIRATION_HOURS = 24;
  private readonly MAX_RESET_ATTEMPTS_PER_HOUR = 1;

  constructor(private pool: Pool) {}

  /**
   * Request password reset
   * Generates a secure reset token and stores it in the database
   *
   * @param email - User email address
   * @returns Reset token (for testing; in production, only send via email)
   */
  async requestPasswordReset(email: string, ipAddress: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Find user by email
      const userResult = await client.query(
        'SELECT id, email FROM auth.users WHERE email = $1 AND deleted_at IS NULL',
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists - just log success
        log.info(`Password reset requested for non-existent email: ${email}`);
        await client.query('COMMIT');
        return;
      }

      const user = userResult.rows[0];

      // Check rate limiting - max 1 request per hour
      const recentTokens = await client.query(
        `SELECT COUNT(*) as count FROM auth_management.password_reset_tokens
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [user.id]
      );

      if (parseInt(recentTokens.rows[0].count) >= this.MAX_RESET_ATTEMPTS_PER_HOUR) {
        throw new AppError(
          'Too many password reset requests. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }

      // Generate secure token (32 bytes = 256 bits of entropy)
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Store hashed token in database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRATION_HOURS);

      await client.query(
        `INSERT INTO auth_management.password_reset_tokens
         (user_id, token_hash, expires_at, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [user.id, tokenHash, expiresAt, ipAddress]
      );

      // Log the attempt in auth_attempts
      await client.query(
        `INSERT INTO auth_management.auth_attempts
         (email, ip_address, success, metadata)
         VALUES ($1, $2, $3, $4)`,
        [email, ipAddress, true, JSON.stringify({ action: 'password_reset_requested' })]
      );

      await client.query('COMMIT');

      // In production, send email with reset link
      // For now, just log to console
      const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
      log.info(`
========================================
PASSWORD RESET EMAIL (Mock)
========================================
To: ${user.email}
Subject: Reset Your Password

Hello,

You requested a password reset. Click the link below to reset your password:

${resetLink}

This link will expire in ${this.TOKEN_EXPIRATION_HOURS} hours.

If you didn't request this reset, please ignore this email.
========================================
      `);

      log.info(`Password reset token generated for user: ${user.email}`);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error requesting password reset:', error);
      throw new AppError('Failed to process password reset request', 500, ErrorCode.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  }

  /**
   * Reset password using token
   *
   * @param token - Reset token from email
   * @param newPassword - New password
   */
  async resetPassword(token: string, newPassword: string, ipAddress: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Hash the provided token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid token
      const tokenResult = await client.query(
        `SELECT * FROM auth_management.password_reset_tokens
         WHERE token_hash = $1
           AND expires_at > NOW()
           AND used_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        // Log failed attempt
        await client.query(
          `INSERT INTO auth_management.auth_attempts
           (email, ip_address, success, failure_reason, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            'unknown',
            ipAddress,
            false,
            'invalid_or_expired_token',
            JSON.stringify({ action: 'password_reset_failed' }),
          ]
        );

        await client.query('COMMIT');
        throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
      }

      const resetToken = tokenResult.rows[0];

      // Validate password strength
      if (!this.isPasswordStrong(newPassword)) {
        throw new AppError(
          'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number',
          400,
          ErrorCode.WEAK_PASSWORD
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await client.query(
        'UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, resetToken.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE auth_management.password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [resetToken.id]
      );

      // Get user email for logging
      const userResult = await client.query('SELECT email FROM auth.users WHERE id = $1', [
        resetToken.user_id,
      ]);

      const userEmail = userResult.rows[0]?.email || 'unknown';

      // Log successful reset
      await client.query(
        `INSERT INTO auth_management.auth_attempts
         (email, ip_address, success, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          userEmail,
          ipAddress,
          true,
          JSON.stringify({ action: 'password_reset_completed', user_id: resetToken.user_id }),
        ]
      );

      await client.query('COMMIT');

      log.info(`Password reset successfully for user: ${userEmail}`);

      // In production, send confirmation email
      log.info(`
========================================
PASSWORD RESET CONFIRMATION EMAIL (Mock)
========================================
To: ${userEmail}
Subject: Password Reset Confirmation

Hello,

Your password has been successfully reset.

If you didn't make this change, please contact support immediately.
========================================
      `);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error resetting password:', error);
      throw new AppError('Failed to reset password', 500, ErrorCode.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  }

  /**
   * Validate password strength
   */
  private isPasswordStrong(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.pool.query(
        `DELETE FROM auth_management.password_reset_tokens
         WHERE expires_at < NOW() - INTERVAL '7 days'`
      );

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        log.info(`Cleaned up ${deletedCount} expired password reset tokens`);
      }

      return deletedCount;
    } catch (error) {
      log.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}
