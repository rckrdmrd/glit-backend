/**
 * Achievements Service
 *
 * Manages achievement unlocking and tracking.
 * Implements solution for BUG #5: Achievements No Se Desbloquean
 */

import { Pool } from 'pg';
import { log } from '../../shared/utils/logger';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  mlCoinsReward: number;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: {
    type: string;
    value: number;
  };
}

export interface UserAchievement {
  achievementId: string;
  userId: string;
  unlockedAt: Date;
  progress: number;
}

export class AchievementsService {
  constructor(private pool: Pool) {}

  /**
   * Check if user has unlocked any achievements based on their stats
   * TODO: Implement complete achievement checking logic as per BUG #5
   */
  async checkAchievements(
    userId: string,
    context: {
      exerciseId?: string;
      score?: number;
      hintsUsed?: number;
      timeSpent?: number;
    }
  ): Promise<Achievement[]> {
    try {
      const unlockedAchievements: Achievement[] = [];

      // Get user stats
      const statsResult = await this.pool.query(
        `SELECT * FROM gamification_system.user_stats WHERE user_id = $1`,
        [userId]
      );

      if (statsResult.rows.length === 0) {
        return [];
      }

      const stats = statsResult.rows[0];

      // Get already unlocked achievements
      const userAchievementsResult = await this.pool.query(
        `SELECT achievement_id FROM gamification_system.user_achievements WHERE user_id = $1`,
        [userId]
      );

      const unlockedIds = userAchievementsResult.rows.map(row => row.achievement_id);

      // TODO: Implement full achievement checking logic
      // See: /home/isem/workspace/docs/projects/glit/09-analysis/gamification/bugs-and-solutions.md
      // Lines: 581-722 (BUG #5)

      // Example: First 10 exercises
      if (stats.exercises_completed >= 10 && !unlockedIds.includes('first_10_exercises')) {
        const achievement = await this.unlockAchievement(userId, 'first_10_exercises');
        if (achievement) {
          unlockedAchievements.push(achievement);
        }
      }

      // Example: Perfect score
      if (context.score === 100 && !unlockedIds.includes('perfectionist')) {
        const perfectScoresResult = await this.pool.query(
          `SELECT COUNT(*) as count
           FROM progress_tracking.exercise_attempts
           WHERE user_id = $1 AND score = 100`,
          [userId]
        );

        if (parseInt(perfectScoresResult.rows[0].count) >= 5) {
          const achievement = await this.unlockAchievement(userId, 'perfectionist');
          if (achievement) {
            unlockedAchievements.push(achievement);
          }
        }
      }

      return unlockedAchievements;
    } catch (error) {
      log.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Unlock an achievement for a user
   */
  async unlockAchievement(userId: string, achievementId: string): Promise<Achievement | null> {
    try {
      // Insert user achievement record
      await this.pool.query(
        `INSERT INTO gamification_system.user_achievements (user_id, achievement_id, unlocked_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, achievement_id) DO NOTHING`,
        [userId, achievementId]
      );

      // Get achievement details
      const achievementResult = await this.pool.query(
        `SELECT * FROM gamification_system.achievements WHERE id = $1`,
        [achievementId]
      );

      if (achievementResult.rows.length === 0) {
        return null;
      }

      const achievement = achievementResult.rows[0];

      log.info(`Achievement unlocked: ${achievementId} for user ${userId}`);

      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        mlCoinsReward: achievement.ml_coins_reward,
        xpReward: achievement.xp_reward,
        rarity: achievement.rarity,
        requirement: achievement.requirement
      };
    } catch (error) {
      log.error('Error unlocking achievement:', error);
      return null;
    }
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const result = await this.pool.query(
        `SELECT achievement_id, user_id, unlocked_at, progress
         FROM gamification_system.user_achievements
         WHERE user_id = $1
         ORDER BY unlocked_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        achievementId: row.achievement_id,
        userId: row.user_id,
        unlockedAt: row.unlocked_at,
        progress: row.progress || 0
      }));
    } catch (error) {
      log.error('Error getting user achievements:', error);
      return [];
    }
  }

  /**
   * Alias for checkAchievements (backward compatibility)
   */
  async checkAndUnlockAchievements(
    userId: string,
    context: {
      exerciseId?: string;
      score?: number;
      hintsUsed?: number;
      timeSpent?: number;
    }
  ): Promise<Achievement[]> {
    return this.checkAchievements(userId, context);
  }

  /**
   * Get all available achievements
   */
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM gamification_system.achievements ORDER BY category, rarity`
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        category: row.category,
        mlCoinsReward: row.ml_coins_reward,
        xpReward: row.xp_reward,
        rarity: row.rarity,
        requirement: row.requirement
      }));
    } catch (error) {
      log.error('Error getting all achievements:', error);
      return [];
    }
  }
}
