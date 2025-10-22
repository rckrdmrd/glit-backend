/**
 * Coins Service
 *
 * Business logic for ML Coins economy operations.
 */

import { CoinsRepository, EarnCoinsParams, SpendCoinsParams } from './coins.repository';
import { RanksService } from './ranks.service';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import { PoolClient } from 'pg';

export class CoinsService {
  constructor(
    private coinsRepository: CoinsRepository,
    private ranksService: RanksService
  ) {}

  /**
   * Earning rules based on documentation
   */
  private readonly EARNING_RULES = {
    EXERCISE_COMPLETION: 15,
    PERFECT_SCORE_MIN: 6,
    PERFECT_SCORE_MAX: 12,
    DAILY_STREAK: 2,
    ACHIEVEMENT_MIN: 25,
    ACHIEVEMENT_MAX: 200,
    SOCIAL_MIN: 5,
    SOCIAL_MAX: 25,
    DAILY_LOGIN: 10,
    MODULE_COMPLETION: 50,
    FIRST_ATTEMPT_SUCCESS: 15,
  };

  /**
   * Get user's ML Coins balance and history
   */
  async getBalance(userId: string, dbClient?: PoolClient): Promise<any> {
    try {
      const balance = await this.coinsRepository.getBalance(userId, dbClient);

      if (!balance) {
        throw new AppError('User balance not found', 404, ErrorCode.NOT_FOUND);
      }

      return {
        userId: balance.userId,
        balance: balance.mlCoins,
        earnedTotal: balance.mlCoinsEarnedTotal,
        spentTotal: balance.mlCoinsSpentTotal,
        earnedToday: balance.mlCoinsEarnedToday,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error getting balance:', error);
      throw new AppError('Failed to get balance', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Award ML Coins to user
   */
  async earnCoins(params: EarnCoinsParams, dbClient?: PoolClient): Promise<any> {
    try {
      // Get user's current rank multiplier
      const rankMultiplier = await this.ranksService.getCurrentMultiplier(params.userId, dbClient);

      // Calculate final multiplier (rank multiplier * any additional multiplier passed)
      const baseMultiplier = params.multiplier || 1.0;
      const finalMultiplier = rankMultiplier * baseMultiplier;

      // Apply multiplier to base amount
      const baseAmount = params.amount;
      const finalAmount = Math.floor(baseAmount * finalMultiplier);

      // Log for debugging
      log.info(
        `Earning coins for user ${params.userId}: ` +
        `base=${baseAmount}, rankMultiplier=${rankMultiplier}, ` +
        `additionalMultiplier=${baseMultiplier}, finalMultiplier=${finalMultiplier}, ` +
        `finalAmount=${finalAmount}`
      );

      // Create updated params with final amount and multiplier
      const updatedParams: EarnCoinsParams = {
        ...params,
        amount: finalAmount,
        multiplier: finalMultiplier,
      };

      const transaction = await this.coinsRepository.earnCoins(updatedParams, dbClient);

      return {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          balanceBefore: transaction.balance_before,
          balanceAfter: transaction.balance_after,
          reason: transaction.reason,
          multiplier: transaction.multiplier,
          createdAt: transaction.created_at,
        },
        newBalance: transaction.balance_after,
      };
    } catch (error) {
      log.error('Error earning coins:', error);
      throw new AppError('Failed to earn coins', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Spend ML Coins
   */
  async spendCoins(params: SpendCoinsParams, dbClient?: PoolClient): Promise<any> {
    try {
      const transaction = await this.coinsRepository.spendCoins(params, dbClient);

      return {
        transaction: {
          id: transaction.id,
          amount: Math.abs(transaction.amount),
          balanceBefore: transaction.balance_before,
          balanceAfter: transaction.balance_after,
          item: params.item,
          createdAt: transaction.created_at,
        },
        newBalance: transaction.balance_after,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient ML Coins balance') {
        throw new AppError('Insufficient ML Coins', 400, ErrorCode.INSUFFICIENT_FUNDS);
      }
      log.error('Error spending coins:', error);
      throw new AppError('Failed to spend coins', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(userId: string, limit: number = 20, offset: number = 0, dbClient?: PoolClient): Promise<any> {
    try {
      const transactions = await this.coinsRepository.getTransactions(userId, limit, offset, dbClient);

      return transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        balanceBefore: t.balance_before,
        balanceAfter: t.balance_after,
        type: t.transaction_type,
        description: t.description,
        reason: t.reason,
        referenceId: t.reference_id,
        multiplier: t.multiplier,
        bonusApplied: t.bonus_applied,
        createdAt: t.created_at,
      }));
    } catch (error) {
      log.error('Error getting transactions:', error);
      throw new AppError('Failed to get transactions', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get leaderboard by ML Coins
   */
  async getLeaderboard(limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const leaderboard = await this.coinsRepository.getLeaderboard(limit, dbClient);

      return leaderboard.map((entry, index) => ({
        position: index + 1,
        userId: entry.user_id,
        name: entry.name,
        balance: entry.ml_coins,
        totalEarned: entry.ml_coins_earned_total,
        rank: entry.current_rank,
      }));
    } catch (error) {
      log.error('Error getting leaderboard:', error);
      throw new AppError('Failed to get leaderboard', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Helper: Award coins for exercise completion
   */
  async awardExerciseCompletion(
    userId: string,
    score: number,
    difficulty: string,
    multiplier: number = 1.0,
    dbClient?: PoolClient
  ): Promise<any> {
    let amount = this.EARNING_RULES.EXERCISE_COMPLETION;

    // Perfect score bonus
    if (score === 100) {
      const bonusScale = difficulty === 'hard' ? 1.0 : difficulty === 'medium' ? 0.75 : 0.5;
      const perfectBonus = Math.round(
        this.EARNING_RULES.PERFECT_SCORE_MIN +
          (this.EARNING_RULES.PERFECT_SCORE_MAX - this.EARNING_RULES.PERFECT_SCORE_MIN) * bonusScale
      );
      amount += perfectBonus;
    }

    return this.earnCoins(
      {
        userId,
        amount,
        reason: `Exercise completed (score: ${score}%)`,
        transactionType: 'earned_exercise',
        multiplier,
      },
      dbClient
    );
  }

  /**
   * Helper: Award coins for daily streak
   */
  async awardDailyStreak(userId: string, streakDays: number, multiplier: number = 1.0, dbClient?: PoolClient): Promise<any> {
    const amount = this.EARNING_RULES.DAILY_STREAK * streakDays;

    return this.earnCoins(
      {
        userId,
        amount,
        reason: `Daily streak: ${streakDays} days`,
        transactionType: 'earned_streak',
        multiplier,
      },
      dbClient
    );
  }

  /**
   * Helper: Award coins for achievement unlock
   */
  async awardAchievement(
    userId: string,
    achievementName: string,
    rarity: string,
    multiplier: number = 1.0,
    dbClient?: PoolClient
  ): Promise<any> {
    const rarityMap: Record<string, number> = {
      common: 25,
      rare: 50,
      epic: 100,
      legendary: 200,
    };

    const amount = rarityMap[rarity] || this.EARNING_RULES.ACHIEVEMENT_MIN;

    return this.earnCoins(
      {
        userId,
        amount,
        reason: `Achievement unlocked: ${achievementName}`,
        transactionType: 'earned_achievement',
        multiplier,
      },
      dbClient
    );
  }

  /**
   * Get earning statistics
   */
  async getEarningStats(userId: string, dbClient?: PoolClient): Promise<any> {
    try {
      const stats = await this.coinsRepository.getEarningStats(userId, dbClient);

      return {
        totalEarnTransactions: parseInt(stats.total_earn_transactions) || 0,
        totalSpendTransactions: parseInt(stats.total_spend_transactions) || 0,
        totalEarned: parseInt(stats.total_earned) || 0,
        totalSpent: parseInt(stats.total_spent) || 0,
        avgEarnedPerTransaction: parseFloat(stats.avg_earned_per_transaction) || 0,
        avgSpentPerTransaction: parseFloat(stats.avg_spent_per_transaction) || 0,
        highestEarning: parseInt(stats.highest_earning) || 0,
        highestSpending: Math.abs(parseInt(stats.highest_spending)) || 0,
      };
    } catch (error) {
      log.error('Error getting earning stats:', error);
      throw new AppError('Failed to get earning stats', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get economic health metrics (admin only)
   */
  async getEconomicMetrics(dbClient?: PoolClient): Promise<any> {
    try {
      const metrics = await this.coinsRepository.getEconomicMetrics(dbClient);

      return {
        totalInCirculation: parseInt(metrics.total_ml_coins_in_circulation) || 0,
        totalEarned: parseInt(metrics.total_ml_coins_earned) || 0,
        totalSpent: parseInt(metrics.total_ml_coins_spent) || 0,
        avgBalancePerUser: parseFloat(metrics.avg_balance_per_user) || 0,
        totalUsers: parseInt(metrics.total_users) || 0,
        spendingRate: parseFloat(metrics.spending_rate_percentage) || 0,
        inflationRate: this.calculateInflationRate(metrics),
      };
    } catch (error) {
      log.error('Error getting economic metrics:', error);
      throw new AppError('Failed to get economic metrics', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Calculate inflation rate
   */
  private calculateInflationRate(metrics: any): number {
    const totalEarned = parseInt(metrics.total_ml_coins_earned) || 0;
    const totalSpent = parseInt(metrics.total_ml_coins_spent) || 0;

    if (totalEarned === 0) return 0;

    const netIncrease = totalEarned - totalSpent;
    const inflationRate = (netIncrease / totalEarned) * 100;

    return parseFloat(inflationRate.toFixed(2));
  }
}
