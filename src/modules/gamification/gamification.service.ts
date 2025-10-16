/**
 * Gamification Service
 *
 * Business logic for gamification operations.
 */

import { GamificationRepository } from './gamification.repository';
import { AddMLCoinsDto, UnlockAchievementDto, UserStatsResponse } from './gamification.types';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import { PoolClient } from 'pg';

export class GamificationService {
  constructor(private gamificationRepository: GamificationRepository) {}

  /**
   * Get user statistics
   *
   * @param userId - User ID
   * @param dbClient - Optional database client (for RLS)
   * @returns User stats
   */
  async getUserStats(userId: string, dbClient?: PoolClient): Promise<UserStatsResponse> {
    try {
      const stats = await this.gamificationRepository.getUserStats(userId, dbClient);

      if (!stats) {
        throw new AppError('User stats not found', 404, ErrorCode.NOT_FOUND);
      }

      return {
        userId: stats.user_id,
        mlCoins: stats.ml_coins,
        mlCoinsEarnedTotal: stats.ml_coins_earned_total,
        mlCoinsSpentTotal: stats.ml_coins_spent_total,
        totalXP: stats.total_xp,
        currentLevel: stats.current_level,
        currentRank: stats.current_rank,
        rankProgress: stats.rank_progress,
        streakDays: stats.streak_days,
        longestStreak: stats.longest_streak,
        lastLoginAt: stats.last_login_at || null,
        totalExercisesCompleted: stats.total_exercises_completed,
        perfectScores: stats.perfect_scores,
        averageScore: stats.average_score,
        updatedAt: stats.updated_at,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error getting user stats:', error);
      throw new AppError('Failed to get user stats', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Add ML Coins to user
   *
   * @param addCoinsDto - Add coins data
   * @param dbClient - Optional database client
   * @returns New balance and transaction details
   */
  async addMLCoins(addCoinsDto: AddMLCoinsDto, dbClient?: PoolClient) {
    try {
      const { userId, amount, reason, transactionType, referenceId } = addCoinsDto;

      if (amount === 0) {
        throw new AppError('Amount must be non-zero', 400, 'INVALID_AMOUNT');
      }

      const newBalance = await this.gamificationRepository.updateMLCoins(
        userId,
        amount,
        transactionType,
        reason,
        referenceId,
        dbClient
      );

      return {
        newBalance,
        transaction: {
          amount,
          reason,
          balanceAfter: newBalance,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient ML Coins balance') {
        throw new AppError('Insufficient ML Coins', 400, ErrorCode.INSUFFICIENT_FUNDS);
      }
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error adding ML Coins:', error);
      throw new AppError('Failed to add ML Coins', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get ML Coins transactions
   *
   * @param userId - User ID
   * @param limit - Number of transactions
   * @param dbClient - Optional database client
   * @returns Array of transactions
   */
  async getMLCoinsTransactions(userId: string, limit: number = 20, dbClient?: PoolClient) {
    try {
      const transactions = await this.gamificationRepository.getMLCoinsTransactions(
        userId,
        limit,
        dbClient
      );

      return transactions.map((t) => ({
        id: t.id,
        userId: t.user_id,
        amount: t.amount,
        transactionType: t.transaction_type,
        reason: t.reason,
        referenceId: t.reference_id,
        balanceAfter: t.balance_after,
        createdAt: t.created_at,
      }));
    } catch (error) {
      log.error('Error getting ML Coins transactions:', error);
      throw new AppError('Failed to get transactions', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get all achievements
   *
   * @returns Array of achievements
   */
  async getAllAchievements() {
    try {
      const achievements = await this.gamificationRepository.getAllAchievements();

      return achievements.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        icon: a.icon,
        rarity: a.rarity,
        mlCoinsReward: a.ml_coins_reward,
        xpReward: a.xp_reward,
        isSecret: a.is_secret,
        createdAt: a.created_at,
      }));
    } catch (error) {
      log.error('Error getting achievements:', error);
      throw new AppError('Failed to get achievements', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get user achievements
   *
   * @param userId - User ID
   * @param dbClient - Optional database client
   * @returns Array of user achievements
   */
  async getUserAchievements(userId: string, dbClient?: PoolClient) {
    try {
      const achievements = await this.gamificationRepository.getUserAchievements(userId, dbClient);

      return achievements.map((ua) => ({
        id: ua.id,
        userId: ua.user_id,
        achievementId: ua.achievement_id,
        achievement: {
          name: ua.name,
          description: ua.description,
          icon: ua.icon,
          rarity: ua.rarity,
          mlCoinsReward: ua.ml_coins_reward,
          xpReward: ua.xp_reward,
        },
        unlockedAt: ua.unlocked_at,
        progress: ua.progress,
      }));
    } catch (error) {
      log.error('Error getting user achievements:', error);
      throw new AppError('Failed to get user achievements', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Unlock achievement for user
   *
   * @param unlockDto - Unlock achievement data
   * @param dbClient - Optional database client
   * @returns User achievement with rewards
   */
  async unlockAchievement(unlockDto: UnlockAchievementDto, dbClient?: PoolClient) {
    try {
      const { userId, achievementId, progress = 100 } = unlockDto;

      const userAchievement = await this.gamificationRepository.unlockAchievement(
        userId,
        achievementId,
        progress,
        dbClient
      );

      // Get achievement details
      const achievements = await this.gamificationRepository.getAllAchievements();
      const achievement = achievements.find((a) => a.id === achievementId);

      if (!achievement) {
        throw new AppError('Achievement not found', 404, ErrorCode.NOT_FOUND);
      }

      return {
        userAchievement: {
          id: userAchievement.id,
          userId: userAchievement.user_id,
          achievementId: userAchievement.achievement_id,
          unlockedAt: userAchievement.unlocked_at,
          progress: userAchievement.progress,
        },
        rewards: {
          mlCoins: achievement.ml_coins_reward,
          xp: achievement.xp_reward,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Achievement already unlocked') {
        throw new AppError('Achievement already unlocked', 409, 'ACHIEVEMENT_ALREADY_UNLOCKED');
      }
      if (error instanceof Error && error.message === 'Achievement not found') {
        throw new AppError('Achievement not found', 404, 'ACHIEVEMENT_NOT_FOUND');
      }
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error unlocking achievement:', error);
      throw new AppError('Failed to unlock achievement', 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
