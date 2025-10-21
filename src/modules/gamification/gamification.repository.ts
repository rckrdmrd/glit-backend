/**
 * Gamification Repository
 *
 * Database access layer for gamification operations.
 */

import { Pool, PoolClient } from 'pg';
import { UserStats, Achievement, UserAchievement, MLCoinsTransaction } from '../../shared/types';
import { log } from '../../shared/utils/logger';

export class GamificationRepository {
  constructor(private pool: Pool) {}

  /**
   * Get user statistics
   *
   * @param userId - User ID
   * @param dbClient - Optional database client (for RLS context)
   * @returns User stats or null
   */
  async getUserStats(userId: string, dbClient?: PoolClient): Promise<UserStats | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<UserStats>(
        'SELECT * FROM gamification_system.user_stats WHERE user_id = $1',
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Update ML Coins
   *
   * @param userId - User ID
   * @param amount - Amount to add (positive) or subtract (negative)
   * @param transactionType - Type of transaction
   * @param reason - Reason for transaction
   * @param referenceId - Optional reference ID
   * @param dbClient - Optional database client (for RLS context)
   * @returns Updated balance
   */
  async updateMLCoins(
    userId: string,
    amount: number,
    transactionType: string,
    reason: string,
    referenceId?: string,
    dbClient?: PoolClient
  ): Promise<number> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      // Get current balance
      const statsResult = await client.query<UserStats>(
        'SELECT ml_coins FROM gamification_system.user_stats WHERE user_id = $1',
        [userId]
      );

      const currentBalance = statsResult.rows[0]?.ml_coins || 0;
      const newBalance = currentBalance + amount;

      // Prevent negative balance
      if (newBalance < 0) {
        throw new Error('Insufficient ML Coins balance');
      }

      // Update user stats
      if (amount > 0) {
        // Earned coins
        await client.query(
          `UPDATE gamification_system.user_stats
           SET ml_coins = ml_coins + $1,
               ml_coins_earned_total = ml_coins_earned_total + $1,
               updated_at = NOW()
           WHERE user_id = $2`,
          [amount, userId]
        );
      } else {
        // Spent coins
        await client.query(
          `UPDATE gamification_system.user_stats
           SET ml_coins = ml_coins + $1,
               ml_coins_spent_total = ml_coins_spent_total + $2,
               updated_at = NOW()
           WHERE user_id = $3`,
          [amount, Math.abs(amount), userId]
        );
      }

      // Create transaction record
      await client.query(
        `INSERT INTO gamification_system.ml_coins_transactions (
          user_id,
          amount,
          balance_before,
          balance_after,
          transaction_type,
          reason,
          reference_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, amount, currentBalance, newBalance, transactionType, reason, referenceId]
      );

      await client.query('COMMIT');

      log.info(`ML Coins updated for user ${userId}: ${amount} (new balance: ${newBalance})`);

      return newBalance;
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error updating ML Coins:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Get ML Coins transactions
   *
   * @param userId - User ID
   * @param limit - Number of transactions to retrieve
   * @param dbClient - Optional database client
   * @returns Array of transactions
   */
  async getMLCoinsTransactions(
    userId: string,
    limit: number = 20,
    dbClient?: PoolClient
  ): Promise<MLCoinsTransaction[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<MLCoinsTransaction>(
        `SELECT * FROM gamification_system.ml_coins_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting ML Coins transactions:', error);
      throw error;
    }
  }

  /**
   * Get all achievements
   *
   * @returns Array of achievements
   */
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const result = await this.pool.query<Achievement>(
        'SELECT * FROM gamification_system.achievements WHERE is_secret = false ORDER BY created_at'
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting achievements:', error);
      throw error;
    }
  }

  /**
   * Get user achievements
   *
   * @param userId - User ID
   * @param dbClient - Optional database client
   * @returns Array of user achievements with details
   */
  async getUserAchievements(userId: string, dbClient?: PoolClient): Promise<any[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          ua.*,
          a.name,
          a.description,
          a.icon,
          a.rarity,
          (a.rewards->>'ml_coins')::int as ml_coins_reward,
          (a.rewards->>'xp')::int as xp_reward
         FROM gamification_system.user_achievements ua
         JOIN gamification_system.achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = $1
         ORDER BY ua.completed_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Unlock achievement for user
   *
   * @param userId - User ID
   * @param achievementId - Achievement ID
   * @param progress - Progress percentage (default 100)
   * @param dbClient - Optional database client
   * @returns User achievement record
   */
  async unlockAchievement(
    userId: string,
    achievementId: string,
    progress: number = 100,
    dbClient?: PoolClient
  ): Promise<UserAchievement> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      // Check if achievement already unlocked
      const existing = await client.query(
        'SELECT * FROM gamification_system.user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [userId, achievementId]
      );

      if (existing.rows.length > 0) {
        throw new Error('Achievement already unlocked');
      }

      // Get achievement details
      const achievementResult = await client.query(
        `SELECT
          *,
          (rewards->>'ml_coins')::int as ml_coins_reward,
          (rewards->>'xp')::int as xp_reward
         FROM gamification_system.achievements
         WHERE id = $1`,
        [achievementId]
      );

      const achievement = achievementResult.rows[0];

      if (!achievement) {
        throw new Error('Achievement not found');
      }

      // Unlock achievement
      const userAchievementResult = await client.query<UserAchievement>(
        `INSERT INTO gamification_system.user_achievements (
          user_id,
          achievement_id,
          progress
        )
        VALUES ($1, $2, $3)
        RETURNING *`,
        [userId, achievementId, progress]
      );

      // Award ML Coins and XP
      const mlCoinsReward = achievement.ml_coins_reward || 0;
      const xpReward = achievement.xp_reward || 0;

      if (mlCoinsReward > 0) {
        await client.query(
          `UPDATE gamification_system.user_stats
           SET ml_coins = ml_coins + $1,
               ml_coins_earned_total = ml_coins_earned_total + $1,
               updated_at = NOW()
           WHERE user_id = $2`,
          [mlCoinsReward, userId]
        );

        // Create transaction record
        await client.query(
          `INSERT INTO gamification_system.ml_coins_transactions (
            user_id,
            amount,
            balance_before,
            balance_after,
            transaction_type,
            reason,
            reference_id
          )
          SELECT $1, $2,
                 (SELECT ml_coins - $2 FROM gamification_system.user_stats WHERE user_id = $1),
                 (SELECT ml_coins FROM gamification_system.user_stats WHERE user_id = $1),
                 'earned_achievement', $3, $4`,
          [userId, mlCoinsReward, `Achievement: ${achievement.name}`, achievementId]
        );
      }

      if (xpReward > 0) {
        await client.query(
          `UPDATE gamification_system.user_stats
           SET total_xp = total_xp + $1,
               updated_at = NOW()
           WHERE user_id = $2`,
          [xpReward, userId]
        );
      }

      await client.query('COMMIT');

      log.info(`Achievement unlocked: ${achievement.name} for user ${userId}`);

      return userAchievementResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error unlocking achievement:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }
}
