/**
 * Missions Event Helper
 *
 * Convenient wrapper for updating mission progress from other modules.
 * Import this in your services to easily integrate with the missions system.
 */

import { missionsService } from './missions.routes';
import { ObjectiveType } from './missions.types';
import { log } from '../../../shared/utils/logger';
import { PoolClient } from 'pg';

/**
 * Mission Progress Events
 *
 * Use these functions to update mission progress from other modules.
 * All functions are safe and won't throw errors to prevent breaking the main flow.
 */
export class MissionEvents {
  /**
   * Track exercise completion
   */
  static async onExerciseCompleted(
    userId: string,
    options: {
      score?: number;
      usedHints?: boolean;
      dbClient?: PoolClient;
    } = {}
  ): Promise<void> {
    try {
      // Update exercises_completed
      await missionsService.updateMissionProgress(
        userId,
        'exercises_completed',
        1,
        options.dbClient
      );

      // Update weekly exercises
      await missionsService.updateMissionProgress(
        userId,
        'weekly_exercises',
        1,
        options.dbClient
      );

      // If perfect score, update perfect_scores
      if (options.score === 100) {
        await missionsService.updateMissionProgress(
          userId,
          'perfect_scores',
          1,
          options.dbClient
        );
      }

      // If no hints used, update exercises_no_hints
      if (options.usedHints === false) {
        await missionsService.updateMissionProgress(
          userId,
          'exercises_no_hints',
          1,
          options.dbClient
        );
      }

      log.debug(`Mission progress updated: exercise completed for user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (exercise completed):', error);
    }
  }

  /**
   * Track ML Coins earned
   */
  static async onMLCoinsEarned(
    userId: string,
    amount: number,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'ml_coins_earned',
        amount,
        dbClient
      );

      log.debug(`Mission progress updated: ${amount} ML Coins earned for user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (ML Coins earned):', error);
    }
  }

  /**
   * Track XP earned
   */
  static async onXPEarned(
    userId: string,
    amount: number,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'total_xp_earned',
        amount,
        dbClient
      );

      log.debug(`Mission progress updated: ${amount} XP earned for user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (XP earned):', error);
    }
  }

  /**
   * Track module completion
   */
  static async onModuleCompleted(
    userId: string,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'modules_completed',
        1,
        dbClient
      );

      log.debug(`Mission progress updated: module completed for user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (module completed):', error);
    }
  }

  /**
   * Track power-up usage
   */
  static async onPowerupUsed(
    userId: string,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'powerups_used',
        1,
        dbClient
      );

      log.debug(`Mission progress updated: power-up used by user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (power-up used):', error);
    }
  }

  /**
   * Track achievement unlock
   */
  static async onAchievementUnlocked(
    userId: string,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'achievements_unlocked',
        1,
        dbClient
      );

      log.debug(`Mission progress updated: achievement unlocked for user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (achievement unlocked):', error);
    }
  }

  /**
   * Track rank promotion
   */
  static async onRankUp(
    userId: string,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'rank_up',
        1,
        dbClient
      );

      log.debug(`Mission progress updated: rank up for user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (rank up):', error);
    }
  }

  /**
   * Track login
   */
  static async onLogin(
    userId: string,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'login_days',
        1,
        dbClient
      );

      log.debug(`Mission progress updated: login for user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (login):', error);
    }
  }

  /**
   * Track streak maintenance
   */
  static async onStreakMaintained(
    userId: string,
    streakDays: number,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'streak_maintained',
        streakDays,
        dbClient
      );

      log.debug(`Mission progress updated: streak maintained for user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (streak maintained):', error);
    }
  }

  /**
   * Track helping friends
   */
  static async onFriendHelped(
    userId: string,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'friends_helped',
        1,
        dbClient
      );

      log.debug(`Mission progress updated: friend helped by user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (friend helped):', error);
    }
  }

  /**
   * Track guild joining
   */
  static async onGuildJoined(
    userId: string,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        'guild_joined',
        1,
        dbClient
      );

      log.debug(`Mission progress updated: guild joined by user ${userId}`);
    } catch (error) {
      log.error('Error updating mission progress (guild joined):', error);
    }
  }

  /**
   * Generic mission progress update
   */
  static async updateProgress(
    userId: string,
    actionType: ObjectiveType,
    amount: number = 1,
    dbClient?: PoolClient
  ): Promise<void> {
    try {
      await missionsService.updateMissionProgress(
        userId,
        actionType,
        amount,
        dbClient
      );

      log.debug(`Mission progress updated: ${actionType} +${amount} for user ${userId}`);
    } catch (error) {
      log.error(`Error updating mission progress (${actionType}):`, error);
    }
  }
}

/**
 * Export convenient functions for direct import
 */
export const {
  onExerciseCompleted,
  onMLCoinsEarned,
  onXPEarned,
  onModuleCompleted,
  onPowerupUsed,
  onAchievementUnlocked,
  onRankUp,
  onLogin,
  onStreakMaintained,
  onFriendHelped,
  onGuildJoined,
  updateProgress,
} = MissionEvents;

/**
 * Usage Examples:
 *
 * // In exercises.service.ts
 * import { onExerciseCompleted } from '../gamification/missions/missions.events';
 * await onExerciseCompleted(userId, { score: 100, usedHints: false });
 *
 * // In coins.service.ts
 * import { onMLCoinsEarned } from '../gamification/missions/missions.events';
 * await onMLCoinsEarned(userId, 50);
 *
 * // In gamification.service.ts
 * import { onAchievementUnlocked } from '../gamification/missions/missions.events';
 * await onAchievementUnlocked(userId);
 */
