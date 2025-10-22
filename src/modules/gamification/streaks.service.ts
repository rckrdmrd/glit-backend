/**
 * Streaks Service
 *
 * Manages user activity streaks and streak-related achievements.
 * Implements solution for BUG #3: Streaks Indefinidos
 */

import { Pool } from 'pg';
import { log } from '../../shared/utils/logger';

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  lastActivityAt: Date;
  isActive: boolean;
}

export class StreaksService {
  constructor(private pool: Pool) {}

  /**
   * Calculate current streak for a user
   * Resets streak if inactive for more than 24 hours
   */
  async calculateCurrentStreak(userId: string): Promise<number> {
    try {
      const result = await this.pool.query(
        `SELECT last_activity_at, current_streak
         FROM gamification_system.user_stats
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return 0;
      }

      const stats = result.rows[0];
      const lastActivity = new Date(stats.last_activity_at);
      const now = new Date();
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      // If more than 24 hours inactive, reset streak
      if (hoursSinceActivity > 24) {
        await this.pool.query(
          `UPDATE gamification_system.user_stats
           SET current_streak = 0
           WHERE user_id = $1`,
          [userId]
        );
        return 0;
      }

      return stats.current_streak;
    } catch (error) {
      log.error('Error calculating current streak:', error);
      return 0;
    }
  }

  /**
   * Log user activity and update streak
   */
  async logActivity(userId: string): Promise<StreakInfo> {
    try {
      const lastActivityResult = await this.pool.query(
        `SELECT last_activity_at, current_streak, best_streak
         FROM gamification_system.user_stats
         WHERE user_id = $1`,
        [userId]
      );

      if (lastActivityResult.rows.length === 0) {
        // Initialize user stats if not exists
        await this.pool.query(
          `INSERT INTO gamification_system.user_stats (user_id, current_streak, best_streak, last_activity_at)
           VALUES ($1, 1, 1, NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );
        return {
          currentStreak: 1,
          bestStreak: 1,
          lastActivityAt: new Date(),
          isActive: true
        };
      }

      const stats = lastActivityResult.rows[0];
      const lastActivity = new Date(stats.last_activity_at);
      const now = new Date();

      // Calculate days since last activity
      const daysSinceLast = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      let newStreak = stats.current_streak;
      let newBestStreak = stats.best_streak;

      if (daysSinceLast === 1) {
        // Consecutive day: increment streak
        newStreak = stats.current_streak + 1;
        newBestStreak = Math.max(newBestStreak, newStreak);

        await this.pool.query(
          `UPDATE gamification_system.user_stats
           SET
             current_streak = $1,
             best_streak = $2,
             last_activity_at = NOW()
           WHERE user_id = $3`,
          [newStreak, newBestStreak, userId]
        );
      } else if (daysSinceLast === 0) {
        // Same day: only update timestamp
        await this.pool.query(
          `UPDATE gamification_system.user_stats
           SET last_activity_at = NOW()
           WHERE user_id = $1`,
          [userId]
        );
      } else {
        // Streak broken: reset to 1
        newStreak = 1;

        await this.pool.query(
          `UPDATE gamification_system.user_stats
           SET
             current_streak = 1,
             last_activity_at = NOW()
           WHERE user_id = $1`,
          [userId]
        );
      }

      return {
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        lastActivityAt: now,
        isActive: true
      };
    } catch (error) {
      log.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Get streak information for a user
   */
  async getStreakInfo(userId: string): Promise<StreakInfo> {
    try {
      const result = await this.pool.query(
        `SELECT current_streak, best_streak, last_activity_at
         FROM gamification_system.user_stats
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          currentStreak: 0,
          bestStreak: 0,
          lastActivityAt: new Date(),
          isActive: false
        };
      }

      const stats = result.rows[0];
      const lastActivity = new Date(stats.last_activity_at);
      const now = new Date();
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      return {
        currentStreak: hoursSinceActivity > 24 ? 0 : stats.current_streak,
        bestStreak: stats.best_streak,
        lastActivityAt: lastActivity,
        isActive: hoursSinceActivity <= 24
      };
    } catch (error) {
      log.error('Error getting streak info:', error);
      return {
        currentStreak: 0,
        bestStreak: 0,
        lastActivityAt: new Date(),
        isActive: false
      };
    }
  }

  /**
   * Alias for logActivity (backward compatibility)
   */
  async onUserActivity(userId: string): Promise<void> {
    await this.logActivity(userId);
  }

  /**
   * Check and reset inactive streaks (called by CRON job)
   */
  async checkInactiveStreaks(): Promise<number> {
    try {
      const result = await this.pool.query(
        `UPDATE gamification_system.user_stats
         SET current_streak = 0
         WHERE last_activity_at < NOW() - INTERVAL '24 hours'
           AND current_streak > 0
         RETURNING user_id`
      );

      const resetCount = result.rows.length;

      if (resetCount > 0) {
        log.info(`Reset ${resetCount} inactive streaks`);
      }

      return resetCount;
    } catch (error) {
      log.error('Error checking inactive streaks:', error);
      return 0;
    }
  }
}
