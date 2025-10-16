/**
 * Coins Repository
 *
 * Database access layer for ML Coins economy operations.
 */

import { Pool, PoolClient } from 'pg';
import { log } from '../../shared/utils/logger';

export interface MLCoinsBalance {
  userId: string;
  mlCoins: number;
  mlCoinsEarnedTotal: number;
  mlCoinsSpentTotal: number;
  mlCoinsEarnedToday: number;
}

export interface MLCoinsTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  transaction_type: string;
  description: string | null;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  multiplier: number;
  bonus_applied: boolean;
  metadata: any;
  created_at: Date;
}

export interface EarnCoinsParams {
  userId: string;
  amount: number;
  reason: string;
  transactionType: string;
  referenceId?: string;
  referenceType?: string;
  multiplier?: number;
  metadata?: any;
}

export interface SpendCoinsParams {
  userId: string;
  amount: number;
  item: string;
  transactionType: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: any;
}

export class CoinsRepository {
  constructor(private pool: Pool) {}

  /**
   * Get user's ML Coins balance
   */
  async getBalance(userId: string, dbClient?: PoolClient): Promise<MLCoinsBalance | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          user_id as "userId",
          ml_coins as "mlCoins",
          ml_coins_earned_total as "mlCoinsEarnedTotal",
          ml_coins_spent_total as "mlCoinsSpentTotal",
          ml_coins_earned_today as "mlCoinsEarnedToday"
         FROM gamification_system.user_stats
         WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting ML Coins balance:', error);
      throw error;
    }
  }

  /**
   * Earn ML Coins
   */
  async earnCoins(params: EarnCoinsParams, dbClient?: PoolClient): Promise<MLCoinsTransaction> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      // Get current balance
      const balanceResult = await client.query(
        'SELECT ml_coins FROM gamification_system.user_stats WHERE user_id = $1',
        [params.userId]
      );

      const currentBalance = balanceResult.rows[0]?.ml_coins || 0;
      const multiplier = params.multiplier || 1.0;
      const finalAmount = Math.round(params.amount * multiplier);
      const newBalance = currentBalance + finalAmount;

      // Update user stats
      await client.query(
        `UPDATE gamification_system.user_stats
         SET ml_coins = ml_coins + $1,
             ml_coins_earned_total = ml_coins_earned_total + $1,
             ml_coins_earned_today = ml_coins_earned_today + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [finalAmount, params.userId]
      );

      // Create transaction record
      const transactionResult = await client.query<MLCoinsTransaction>(
        `INSERT INTO gamification_system.ml_coins_transactions (
          user_id,
          amount,
          balance_before,
          balance_after,
          transaction_type,
          description,
          reason,
          reference_id,
          reference_type,
          multiplier,
          bonus_applied,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          params.userId,
          finalAmount,
          currentBalance,
          newBalance,
          params.transactionType,
          params.reason,
          params.reason,
          params.referenceId || null,
          params.referenceType || null,
          multiplier,
          multiplier !== 1.0,
          params.metadata || {},
        ]
      );

      await client.query('COMMIT');

      log.info(`User ${params.userId} earned ${finalAmount} ML Coins (${params.reason})`);

      return transactionResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error earning ML Coins:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Spend ML Coins
   */
  async spendCoins(params: SpendCoinsParams, dbClient?: PoolClient): Promise<MLCoinsTransaction> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      // Get current balance
      const balanceResult = await client.query(
        'SELECT ml_coins FROM gamification_system.user_stats WHERE user_id = $1',
        [params.userId]
      );

      const currentBalance = balanceResult.rows[0]?.ml_coins || 0;

      // Check sufficient balance
      if (currentBalance < params.amount) {
        throw new Error('Insufficient ML Coins balance');
      }

      const newBalance = currentBalance - params.amount;

      // Update user stats
      await client.query(
        `UPDATE gamification_system.user_stats
         SET ml_coins = ml_coins - $1,
             ml_coins_spent_total = ml_coins_spent_total + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [params.amount, params.userId]
      );

      // Create transaction record
      const transactionResult = await client.query<MLCoinsTransaction>(
        `INSERT INTO gamification_system.ml_coins_transactions (
          user_id,
          amount,
          balance_before,
          balance_after,
          transaction_type,
          description,
          reason,
          reference_id,
          reference_type,
          multiplier,
          bonus_applied,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          params.userId,
          -params.amount,
          currentBalance,
          newBalance,
          params.transactionType,
          `Spent on ${params.item}`,
          `Purchased ${params.item}`,
          params.referenceId || null,
          params.referenceType || null,
          1.0,
          false,
          params.metadata || {},
        ]
      );

      await client.query('COMMIT');

      log.info(`User ${params.userId} spent ${params.amount} ML Coins (${params.item})`);

      return transactionResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error spending ML Coins:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    dbClient?: PoolClient
  ): Promise<MLCoinsTransaction[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<MLCoinsTransaction>(
        `SELECT * FROM gamification_system.ml_coins_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions by type
   */
  async getTransactionsByType(
    userId: string,
    transactionType: string,
    limit: number = 20,
    dbClient?: PoolClient
  ): Promise<MLCoinsTransaction[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<MLCoinsTransaction>(
        `SELECT * FROM gamification_system.ml_coins_transactions
         WHERE user_id = $1 AND transaction_type = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [userId, transactionType, limit]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting transactions by type:', error);
      throw error;
    }
  }

  /**
   * Get ML Coins leaderboard
   */
  async getLeaderboard(limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          us.user_id,
          p.full_name as name,
          us.ml_coins,
          us.ml_coins_earned_total,
          ur.current_rank
         FROM gamification_system.user_stats us
         JOIN auth_management.profiles p ON us.user_id = p.id
         LEFT JOIN gamification_system.user_ranks ur ON us.user_id = ur.user_id AND ur.is_current = true
         ORDER BY us.ml_coins_earned_total DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting ML Coins leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get earning statistics
   */
  async getEarningStats(userId: string, dbClient?: PoolClient): Promise<any> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE amount > 0) as total_earn_transactions,
          COUNT(*) FILTER (WHERE amount < 0) as total_spend_transactions,
          SUM(amount) FILTER (WHERE amount > 0) as total_earned,
          SUM(ABS(amount)) FILTER (WHERE amount < 0) as total_spent,
          AVG(amount) FILTER (WHERE amount > 0) as avg_earned_per_transaction,
          AVG(ABS(amount)) FILTER (WHERE amount < 0) as avg_spent_per_transaction,
          MAX(amount) as highest_earning,
          MIN(amount) as highest_spending
         FROM gamification_system.ml_coins_transactions
         WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0];
    } catch (error) {
      log.error('Error getting earning stats:', error);
      throw error;
    }
  }

  /**
   * Reset daily earnings counter
   * Should be called by a scheduled job daily
   */
  async resetDailyEarnings(dbClient?: PoolClient): Promise<number> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `UPDATE gamification_system.user_stats
         SET ml_coins_earned_today = 0,
             updated_at = NOW()
         WHERE ml_coins_earned_today > 0
         RETURNING user_id`
      );

      log.info(`Reset daily earnings for ${result.rowCount} users`);

      return result.rowCount || 0;
    } catch (error) {
      log.error('Error resetting daily earnings:', error);
      throw error;
    }
  }

  /**
   * Get economic health metrics
   */
  async getEconomicMetrics(dbClient?: PoolClient): Promise<any> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          SUM(ml_coins) as total_ml_coins_in_circulation,
          SUM(ml_coins_earned_total) as total_ml_coins_earned,
          SUM(ml_coins_spent_total) as total_ml_coins_spent,
          AVG(ml_coins) as avg_balance_per_user,
          COUNT(DISTINCT user_id) as total_users,
          (SUM(ml_coins_spent_total)::FLOAT / NULLIF(SUM(ml_coins_earned_total), 0)) * 100 as spending_rate_percentage
         FROM gamification_system.user_stats`
      );

      return result.rows[0];
    } catch (error) {
      log.error('Error getting economic metrics:', error);
      throw error;
    }
  }
}
