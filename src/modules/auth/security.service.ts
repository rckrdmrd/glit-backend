/**
 * Security Service
 *
 * Handles security-related functionality including:
 * - Login attempt tracking
 * - Rate limiting
 * - Suspicious activity detection
 * - Security logging and auditing
 */

import { Pool } from 'pg';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';

export interface AuthAttempt {
  id: string;
  email: string;
  ip_address: string;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  attempted_at: Date;
  metadata: any;
}

export interface RateLimitStatus {
  isLimited: boolean;
  attemptsRemaining: number;
  resetTime: Date | null;
}

export interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string | null;
  email: string | null;
  ipAddress: string;
  description: string;
  metadata: any;
}

export class SecurityService {
  // Rate limiting configuration
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MINUTES = 15;
  private readonly ACCOUNT_LOCKOUT_MINUTES = 30;

  // Suspicious activity thresholds
  private readonly SUSPICIOUS_FAILED_ATTEMPTS = 3;
  private readonly SUSPICIOUS_IP_CHANGES = 5;

  constructor(private pool: Pool) {}

  /**
   * Log authentication attempt
   *
   * @param email - User email
   * @param ipAddress - IP address
   * @param userAgent - User agent string
   * @param success - Whether attempt was successful
   * @param failureReason - Reason for failure if unsuccessful
   * @param metadata - Additional metadata
   */
  async logAuthAttempt(
    email: string,
    ipAddress: string,
    userAgent: string | null,
    success: boolean,
    failureReason: string | null = null,
    metadata: any = {}
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO auth_management.auth_attempts
         (email, ip_address, user_agent, success, failure_reason, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [email.toLowerCase(), ipAddress, userAgent, success, failureReason, JSON.stringify(metadata)]
      );

      if (!success) {
        // Check if this triggers suspicious activity
        await this.checkSuspiciousActivity(email, ipAddress);
      }
    } catch (error) {
      // Don't throw error - logging should not break authentication flow
      log.error('Error logging auth attempt:', error);
    }
  }

  /**
   * Check rate limit for login attempts
   *
   * @param email - User email
   * @param ipAddress - IP address
   * @returns Rate limit status
   */
  async checkRateLimit(email: string, ipAddress: string): Promise<RateLimitStatus> {
    try {
      // Check failed attempts in the last window
      const result = await this.pool.query(
        `SELECT COUNT(*) as failed_count
         FROM auth_management.auth_attempts
         WHERE (email = $1 OR ip_address = $2)
           AND success = false
           AND attempted_at > NOW() - INTERVAL '${this.RATE_LIMIT_WINDOW_MINUTES} minutes'`,
        [email.toLowerCase(), ipAddress]
      );

      const failedCount = parseInt(result.rows[0].failed_count);

      if (failedCount >= this.MAX_LOGIN_ATTEMPTS) {
        // Calculate when the rate limit resets
        const resetTimeResult = await this.pool.query(
          `SELECT attempted_at + INTERVAL '${this.RATE_LIMIT_WINDOW_MINUTES} minutes' as reset_time
           FROM auth_management.auth_attempts
           WHERE (email = $1 OR ip_address = $2) AND success = false
           ORDER BY attempted_at DESC
           LIMIT 1`,
          [email.toLowerCase(), ipAddress]
        );

        const resetTime = resetTimeResult.rows[0]?.reset_time || null;

        log.warn(
          `Rate limit exceeded for email: ${email}, IP: ${ipAddress} (${failedCount} failed attempts)`
        );

        return {
          isLimited: true,
          attemptsRemaining: 0,
          resetTime,
        };
      }

      return {
        isLimited: false,
        attemptsRemaining: this.MAX_LOGIN_ATTEMPTS - failedCount,
        resetTime: null,
      };
    } catch (error) {
      log.error('Error checking rate limit:', error);
      // In case of error, allow the attempt but log it
      return {
        isLimited: false,
        attemptsRemaining: this.MAX_LOGIN_ATTEMPTS,
        resetTime: null,
      };
    }
  }

  /**
   * Check if account should be temporarily locked
   *
   * @param email - User email
   * @returns True if account is locked
   */
  async isAccountLocked(email: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as failed_count
         FROM auth_management.auth_attempts
         WHERE email = $1
           AND success = false
           AND attempted_at > NOW() - INTERVAL '${this.ACCOUNT_LOCKOUT_MINUTES} minutes'`,
        [email.toLowerCase()]
      );

      const failedCount = parseInt(result.rows[0].failed_count);

      return failedCount >= this.MAX_LOGIN_ATTEMPTS;
    } catch (error) {
      log.error('Error checking account lock status:', error);
      return false;
    }
  }

  /**
   * Check for suspicious activity
   *
   * @param email - User email
   * @param ipAddress - IP address
   */
  private async checkSuspiciousActivity(email: string, ipAddress: string): Promise<void> {
    try {
      // Check for multiple failed attempts
      const failedAttempts = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM auth_management.auth_attempts
         WHERE email = $1
           AND success = false
           AND attempted_at > NOW() - INTERVAL '1 hour'`,
        [email.toLowerCase()]
      );

      const failedCount = parseInt(failedAttempts.rows[0].count);

      if (failedCount >= this.SUSPICIOUS_FAILED_ATTEMPTS) {
        await this.logSecurityEvent({
          type: 'multiple_failed_logins',
          severity: failedCount >= this.MAX_LOGIN_ATTEMPTS ? 'high' : 'medium',
          userId: null,
          email: email.toLowerCase(),
          ipAddress,
          description: `Multiple failed login attempts detected (${failedCount} attempts)`,
          metadata: { failedCount, timeWindow: '1 hour' },
        });
      }

      // Check for login from multiple IPs
      const ipChanges = await this.pool.query(
        `SELECT COUNT(DISTINCT ip_address) as distinct_ips
         FROM auth_management.auth_attempts
         WHERE email = $1
           AND attempted_at > NOW() - INTERVAL '1 hour'`,
        [email.toLowerCase()]
      );

      const distinctIps = parseInt(ipChanges.rows[0].distinct_ips);

      if (distinctIps >= this.SUSPICIOUS_IP_CHANGES) {
        await this.logSecurityEvent({
          type: 'multiple_ip_addresses',
          severity: 'high',
          userId: null,
          email: email.toLowerCase(),
          ipAddress,
          description: `Login attempts from multiple IP addresses (${distinctIps} different IPs)`,
          metadata: { distinctIps, timeWindow: '1 hour' },
        });
      }
    } catch (error) {
      log.error('Error checking suspicious activity:', error);
    }
  }

  /**
   * Log security event
   *
   * @param event - Security event details
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO auth_management.security_events
         (event_type, severity, user_id, email, ip_address, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          event.type,
          event.severity,
          event.userId,
          event.email,
          event.ipAddress,
          event.description,
          JSON.stringify(event.metadata),
        ]
      );

      log.warn(`Security event logged: ${event.type} (${event.severity}) - ${event.description}`);

      // In production, send alerts for high/critical severity events
      if (event.severity === 'high' || event.severity === 'critical') {
        log.error(`SECURITY ALERT: ${event.description}`, event.metadata);
      }
    } catch (error) {
      log.error('Error logging security event:', error);
    }
  }

  /**
   * Get recent authentication attempts for a user
   *
   * @param email - User email
   * @param limit - Maximum number of attempts to return
   */
  async getRecentAttempts(email: string, limit: number = 10): Promise<AuthAttempt[]> {
    try {
      const result = await this.pool.query<AuthAttempt>(
        `SELECT * FROM auth_management.auth_attempts
         WHERE email = $1
         ORDER BY attempted_at DESC
         LIMIT $2`,
        [email.toLowerCase(), limit]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting recent attempts:', error);
      return [];
    }
  }

  /**
   * Get security events for monitoring
   *
   * @param severity - Filter by severity (optional)
   * @param limit - Maximum number of events to return
   */
  async getSecurityEvents(severity?: string, limit: number = 50): Promise<any[]> {
    try {
      let query = `SELECT * FROM auth_management.security_events`;
      const params: any[] = [];

      if (severity) {
        query += ` WHERE severity = $1`;
        params.push(severity);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await this.pool.query(query, params);

      return result.rows;
    } catch (error) {
      log.error('Error getting security events:', error);
      return [];
    }
  }

  /**
   * Clear old authentication attempts (should be run periodically)
   *
   * @param daysToKeep - Number of days of history to keep
   */
  async cleanupOldAttempts(daysToKeep: number = 30): Promise<number> {
    try {
      const result = await this.pool.query(
        `DELETE FROM auth_management.auth_attempts
         WHERE attempted_at < NOW() - INTERVAL '${daysToKeep} days'`
      );

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        log.info(`Cleaned up ${deletedCount} old authentication attempts`);
      }

      return deletedCount;
    } catch (error) {
      log.error('Error cleaning up old attempts:', error);
      return 0;
    }
  }

  /**
   * Generate security report for a user
   *
   * @param userId - User ID
   */
  async generateUserSecurityReport(userId: string): Promise<any> {
    try {
      // Get user email
      const userResult = await this.pool.query('SELECT email FROM auth.users WHERE id = $1', [userId]);

      if (userResult.rows.length === 0) {
        throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      const email = userResult.rows[0].email;

      // Get recent attempts
      const attempts = await this.getRecentAttempts(email, 20);

      // Get active sessions
      const sessions = await this.pool.query(
        `SELECT COUNT(*) as active_sessions
         FROM auth_management.user_sessions
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      );

      // Get security events
      const events = await this.pool.query(
        `SELECT * FROM auth_management.security_events
         WHERE user_id = $1 OR email = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId, email]
      );

      // Calculate stats
      const totalAttempts = attempts.length;
      const successfulAttempts = attempts.filter((a) => a.success).length;
      const failedAttempts = attempts.filter((a) => !a.success).length;

      return {
        userId,
        email,
        activeSessions: parseInt(sessions.rows[0].active_sessions),
        recentAttempts: {
          total: totalAttempts,
          successful: successfulAttempts,
          failed: failedAttempts,
          attempts: attempts.slice(0, 10),
        },
        securityEvents: events.rows,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error generating security report:', error);
      throw new AppError('Failed to generate security report', 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
