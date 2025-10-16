/**
 * Session Management Service
 *
 * Handles user session tracking, device information, and session revocation.
 * Implements enhanced session management as per US-002-02.
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token: string | null;
  user_agent: string | null;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  is_active: boolean;
}

export interface SessionInfo {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  country: string;
  city: string;
  createdAt: Date;
  lastActivityAt: Date;
  isCurrent: boolean;
}

export class SessionManagementService {
  private readonly MAX_SESSIONS_PER_USER = 5;
  private readonly SESSION_EXPIRATION_DAYS = 7;

  constructor(private pool: Pool) {}

  /**
   * Create new session
   *
   * @param userId - User ID
   * @param sessionToken - JWT session token
   * @param refreshToken - Refresh token (optional)
   * @param userAgent - User agent string
   * @param ipAddress - IP address
   */
  async createSession(
    userId: string,
    sessionToken: string,
    refreshToken: string | null,
    userAgent: string | null,
    ipAddress: string | null
  ): Promise<UserSession> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Parse device info from user agent
      const deviceInfo = this.parseUserAgent(userAgent);

      // Parse location from IP (in production, use IP geolocation service)
      const locationInfo = await this.getLocationFromIP(ipAddress);

      // Check if user has too many active sessions
      const activeSessions = await client.query(
        'SELECT COUNT(*) as count FROM auth_management.user_sessions WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      const sessionCount = parseInt(activeSessions.rows[0].count);

      // If at max sessions, deactivate the oldest one
      if (sessionCount >= this.MAX_SESSIONS_PER_USER) {
        await client.query(
          `UPDATE auth_management.user_sessions
           SET is_active = false
           WHERE id = (
             SELECT id FROM auth_management.user_sessions
             WHERE user_id = $1 AND is_active = true
             ORDER BY last_activity_at ASC
             LIMIT 1
           )`,
          [userId]
        );
        log.info(`Deactivated oldest session for user ${userId} (max sessions reached)`);
      }

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.SESSION_EXPIRATION_DAYS);

      // Create new session
      const result = await client.query<UserSession>(
        `INSERT INTO auth_management.user_sessions (
          user_id,
          session_token,
          refresh_token,
          user_agent,
          ip_address,
          device_type,
          browser,
          os,
          country,
          city,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          userId,
          sessionToken,
          refreshToken,
          userAgent,
          ipAddress,
          deviceInfo.deviceType,
          deviceInfo.browser,
          deviceInfo.os,
          locationInfo.country,
          locationInfo.city,
          expiresAt,
        ]
      );

      await client.query('COMMIT');

      const session = result.rows[0];
      log.info(`Session created for user ${userId} from ${ipAddress || 'unknown IP'}`);

      return session;
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error creating session:', error);
      throw new AppError('Failed to create session', 500, ErrorCode.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  }

  /**
   * Get all active sessions for a user
   *
   * @param userId - User ID
   * @param currentSessionToken - Current session token to mark as current
   */
  async getUserSessions(userId: string, currentSessionToken?: string): Promise<SessionInfo[]> {
    try {
      const result = await this.pool.query<UserSession>(
        `SELECT * FROM auth_management.user_sessions
         WHERE user_id = $1 AND is_active = true
         ORDER BY last_activity_at DESC`,
        [userId]
      );

      return result.rows.map((session) => ({
        id: session.id,
        deviceType: session.device_type || 'unknown',
        browser: session.browser || 'unknown',
        os: session.os || 'unknown',
        ipAddress: session.ip_address || 'unknown',
        country: session.country || 'unknown',
        city: session.city || 'unknown',
        createdAt: session.created_at,
        lastActivityAt: session.last_activity_at,
        isCurrent: currentSessionToken ? session.session_token === currentSessionToken : false,
      }));
    } catch (error) {
      log.error('Error getting user sessions:', error);
      throw new AppError('Failed to retrieve sessions', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Update session last activity
   *
   * @param sessionToken - Session token
   */
  async updateSessionActivity(sessionToken: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE auth_management.user_sessions
         SET last_activity_at = NOW()
         WHERE session_token = $1 AND is_active = true`,
        [sessionToken]
      );
    } catch (error) {
      log.error('Error updating session activity:', error);
      // Don't throw error - this is not critical
    }
  }

  /**
   * Revoke specific session
   *
   * @param userId - User ID (for authorization check)
   * @param sessionId - Session ID to revoke
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify session belongs to user
      const sessionResult = await client.query(
        'SELECT user_id FROM auth_management.user_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new AppError('Session not found', 404, ErrorCode.NOT_FOUND);
      }

      if (sessionResult.rows[0].user_id !== userId) {
        throw new AppError('Not authorized to revoke this session', 403, ErrorCode.FORBIDDEN);
      }

      // Revoke session
      await client.query(
        'UPDATE auth_management.user_sessions SET is_active = false WHERE id = $1',
        [sessionId]
      );

      await client.query('COMMIT');

      log.info(`Session ${sessionId} revoked by user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error revoking session:', error);
      throw new AppError('Failed to revoke session', 500, ErrorCode.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  }

  /**
   * Revoke all sessions except current
   *
   * @param userId - User ID
   * @param currentSessionToken - Current session token to keep active
   */
  async revokeAllSessionsExceptCurrent(userId: string, currentSessionToken: string): Promise<number> {
    try {
      const result = await this.pool.query(
        `UPDATE auth_management.user_sessions
         SET is_active = false
         WHERE user_id = $1 AND session_token != $2 AND is_active = true`,
        [userId, currentSessionToken]
      );

      const revokedCount = result.rowCount || 0;
      log.info(`Revoked ${revokedCount} sessions for user ${userId}`);

      return revokedCount;
    } catch (error) {
      log.error('Error revoking all sessions:', error);
      throw new AppError('Failed to revoke sessions', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Revoke all sessions for a user (used for security incidents)
   *
   * @param userId - User ID
   */
  async revokeAllSessions(userId: string): Promise<number> {
    try {
      const result = await this.pool.query(
        'UPDATE auth_management.user_sessions SET is_active = false WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      const revokedCount = result.rowCount || 0;
      log.info(`All sessions revoked for user ${userId} (count: ${revokedCount})`);

      return revokedCount;
    } catch (error) {
      log.error('Error revoking all sessions:', error);
      throw new AppError('Failed to revoke all sessions', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.pool.query(
        `UPDATE auth_management.user_sessions
         SET is_active = false
         WHERE expires_at < NOW() AND is_active = true`
      );

      const deactivatedCount = result.rowCount || 0;
      if (deactivatedCount > 0) {
        log.info(`Deactivated ${deactivatedCount} expired sessions`);
      }

      return deactivatedCount;
    } catch (error) {
      log.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Parse user agent string to extract device info
   */
  private parseUserAgent(userAgent: string | null): {
    deviceType: string;
    browser: string;
    os: string;
  } {
    if (!userAgent) {
      return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
    }

    // Detect device type
    let deviceType = 'desktop';
    if (/mobile/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    // Detect browser
    let browser = 'unknown';
    if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) {
      browser = 'Chrome';
    } else if (/firefox/i.test(userAgent)) {
      browser = 'Firefox';
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      browser = 'Safari';
    } else if (/edge|edg/i.test(userAgent)) {
      browser = 'Edge';
    } else if (/opera|opr/i.test(userAgent)) {
      browser = 'Opera';
    }

    // Detect OS
    let os = 'unknown';
    if (/windows/i.test(userAgent)) {
      os = 'Windows';
    } else if (/macintosh|mac os x/i.test(userAgent)) {
      os = 'macOS';
    } else if (/linux/i.test(userAgent)) {
      os = 'Linux';
    } else if (/android/i.test(userAgent)) {
      os = 'Android';
    } else if (/ios|iphone|ipad/i.test(userAgent)) {
      os = 'iOS';
    }

    return { deviceType, browser, os };
  }

  /**
   * Get location from IP address
   * In production, integrate with IP geolocation service like MaxMind or ipapi
   */
  private async getLocationFromIP(ipAddress: string | null): Promise<{
    country: string;
    city: string;
  }> {
    // Mock implementation - in production, use actual geolocation service
    if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1') {
      return { country: 'Unknown', city: 'Unknown' };
    }

    // For demo purposes, return mock data
    return { country: 'Mexico', city: 'Mexico City' };
  }
}
