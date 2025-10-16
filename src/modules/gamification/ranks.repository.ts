/**
 * Ranks Repository
 *
 * Database access layer for Maya rank operations.
 */

import { Pool, PoolClient } from 'pg';
import { log } from '../../shared/utils/logger';

export interface RankRequirements {
  rank: string;
  xpRequired: number;
  modulesRequired: number;
  mlCoinsThreshold: number;
  achievementsRequired: number;
  minimumScore: number;
  multiplier: number;
  mlBonus: number;
}

export interface UserRankData {
  id: string;
  user_id: string;
  tenant_id: string | null;
  current_rank: string;
  previous_rank: string | null;
  rank_progress_percentage: number;
  modules_required_for_next: number | null;
  modules_completed_for_rank: number;
  xp_required_for_next: number | null;
  xp_earned_for_rank: number;
  ml_coins_bonus: number;
  certificate_url: string | null;
  badge_url: string | null;
  achieved_at: Date;
  previous_rank_achieved_at: Date | null;
  is_current: boolean;
  rank_metadata: any;
  created_at: Date;
  updated_at: Date;
}

export class RanksRepository {
  constructor(private pool: Pool) {}

  /**
   * Maya rank requirements
   */
  private readonly RANK_REQUIREMENTS: Record<string, RankRequirements> = {
    nacom: {
      rank: 'nacom',
      xpRequired: 0,
      modulesRequired: 0,
      mlCoinsThreshold: 0,
      achievementsRequired: 0,
      minimumScore: 70,
      multiplier: 1.0,
      mlBonus: 50,
    },
    batab: {
      rank: 'batab',
      xpRequired: 500,
      modulesRequired: 1,
      mlCoinsThreshold: 200,
      achievementsRequired: 0,
      minimumScore: 75,
      multiplier: 1.25,
      mlBonus: 75,
    },
    holcatte: {
      rank: 'holcatte',
      xpRequired: 1500,
      modulesRequired: 2,
      mlCoinsThreshold: 500,
      achievementsRequired: 3,
      minimumScore: 80,
      multiplier: 1.5,
      mlBonus: 100,
    },
    guerrero: {
      rank: 'guerrero',
      xpRequired: 3000,
      modulesRequired: 3,
      mlCoinsThreshold: 1000,
      achievementsRequired: 6,
      minimumScore: 85,
      multiplier: 1.75,
      mlBonus: 125,
    },
    mercenario: {
      rank: 'mercenario',
      xpRequired: 5000,
      modulesRequired: 5,
      mlCoinsThreshold: 2000,
      achievementsRequired: 10,
      minimumScore: 90,
      multiplier: 2.0,
      mlBonus: 150,
    },
  };

  /**
   * Get rank order for progression
   */
  private readonly RANK_ORDER = ['nacom', 'batab', 'holcatte', 'guerrero', 'mercenario'];

  /**
   * Get all rank requirements
   */
  getRankRequirements(): RankRequirements[] {
    return Object.values(this.RANK_REQUIREMENTS);
  }

  /**
   * Get requirements for a specific rank
   */
  getRankRequirement(rank: string): RankRequirements | null {
    return this.RANK_REQUIREMENTS[rank] || null;
  }

  /**
   * Get user's current rank
   */
  async getUserRank(userId: string, dbClient?: PoolClient): Promise<UserRankData | null> {
    try {
      const query = `SELECT * FROM gamification_system.user_ranks
         WHERE user_id = $1 AND is_current = true`;
      const params = [userId];

      const result = dbClient
        ? await dbClient.query<UserRankData>(query, params)
        : await this.pool.query<UserRankData>(query, params);

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting user rank:', error);
      throw error;
    }
  }

  /**
   * Get user progress toward next rank
   */
  async getUserProgress(userId: string, dbClient?: PoolClient): Promise<any> {
    try {
      const query = `SELECT
          us.total_xp,
          us.modules_completed,
          us.ml_coins_earned_total,
          us.achievements_earned,
          us.average_score,
          ur.current_rank,
          ur.xp_earned_for_rank,
          ur.modules_completed_for_rank
         FROM gamification_system.user_stats us
         LEFT JOIN gamification_system.user_ranks ur ON us.user_id = ur.user_id AND ur.is_current = true
         WHERE us.user_id = $1`;
      const params = [userId];

      const result = dbClient
        ? await dbClient.query(query, params)
        : await this.pool.query(query, params);

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting user progress:', error);
      throw error;
    }
  }

  /**
   * Check if user can be promoted to next rank
   */
  async checkPromotion(userId: string, dbClient?: PoolClient): Promise<{
    canPromote: boolean;
    currentRank: string;
    nextRank: string | null;
    missingRequirements: string[];
  }> {
    const progress = await this.getUserProgress(userId, dbClient);
    if (!progress) {
      return {
        canPromote: false,
        currentRank: 'nacom',
        nextRank: null,
        missingRequirements: ['User progress not found'],
      };
    }

    const currentRank = progress.current_rank || 'nacom';
    const currentIndex = this.RANK_ORDER.indexOf(currentRank);

    if (currentIndex === -1 || currentIndex === this.RANK_ORDER.length - 1) {
      return {
        canPromote: false,
        currentRank,
        nextRank: null,
        missingRequirements: ['Already at maximum rank'],
      };
    }

    const nextRank = this.RANK_ORDER[currentIndex + 1];
    const requirements = this.RANK_REQUIREMENTS[nextRank];

    const missingRequirements: string[] = [];

    if (progress.total_xp < requirements.xpRequired) {
      missingRequirements.push(
        `XP: ${progress.total_xp}/${requirements.xpRequired} (need ${requirements.xpRequired - progress.total_xp} more)`
      );
    }

    if (progress.modules_completed < requirements.modulesRequired) {
      missingRequirements.push(
        `Modules: ${progress.modules_completed}/${requirements.modulesRequired} (need ${requirements.modulesRequired - progress.modules_completed} more)`
      );
    }

    if (progress.ml_coins_earned_total < requirements.mlCoinsThreshold) {
      missingRequirements.push(
        `ML Coins earned: ${progress.ml_coins_earned_total}/${requirements.mlCoinsThreshold} (need ${requirements.mlCoinsThreshold - progress.ml_coins_earned_total} more)`
      );
    }

    if (progress.achievements_earned < requirements.achievementsRequired) {
      missingRequirements.push(
        `Achievements: ${progress.achievements_earned}/${requirements.achievementsRequired} (need ${requirements.achievementsRequired - progress.achievements_earned} more)`
      );
    }

    if (progress.average_score < requirements.minimumScore) {
      missingRequirements.push(
        `Average score: ${progress.average_score}%/${requirements.minimumScore}% (need ${requirements.minimumScore - progress.average_score}% more)`
      );
    }

    return {
      canPromote: missingRequirements.length === 0,
      currentRank,
      nextRank,
      missingRequirements,
    };
  }

  /**
   * Promote user to next rank
   */
  async promoteUser(userId: string, dbClient?: PoolClient): Promise<UserRankData> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      // Check if promotion is possible
      const promotionCheck = await this.checkPromotion(userId, client);

      if (!promotionCheck.canPromote) {
        throw new Error(`Cannot promote user: ${promotionCheck.missingRequirements.join(', ')}`);
      }

      const { currentRank, nextRank } = promotionCheck;

      if (!nextRank) {
        throw new Error('Already at maximum rank');
      }

      const requirements = this.RANK_REQUIREMENTS[nextRank];
      const progress = await this.getUserProgress(userId, client);

      // Mark current rank as not current
      await client.query(
        `UPDATE gamification_system.user_ranks
         SET is_current = false
         WHERE user_id = $1 AND is_current = true`,
        [userId]
      );

      // Create new rank record
      const nextRankIndex = this.RANK_ORDER.indexOf(nextRank);
      const hasNextRank = nextRankIndex < this.RANK_ORDER.length - 1;
      const nextNextRank = hasNextRank ? this.RANK_REQUIREMENTS[this.RANK_ORDER[nextRankIndex + 1]] : null;

      const result = await client.query<UserRankData>(
        `INSERT INTO gamification_system.user_ranks (
          user_id,
          current_rank,
          previous_rank,
          rank_progress_percentage,
          modules_required_for_next,
          modules_completed_for_rank,
          xp_required_for_next,
          xp_earned_for_rank,
          ml_coins_bonus,
          is_current
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING *`,
        [
          userId,
          nextRank,
          currentRank,
          0,
          nextNextRank?.modulesRequired || null,
          progress.modules_completed,
          nextNextRank?.xpRequired || null,
          progress.total_xp,
          requirements.mlBonus,
        ]
      );

      // Award ML Coins bonus
      await client.query(
        `UPDATE gamification_system.user_stats
         SET ml_coins = ml_coins + $1,
             ml_coins_earned_total = ml_coins_earned_total + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [requirements.mlBonus, userId]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO gamification_system.ml_coins_transactions (
          user_id,
          amount,
          transaction_type,
          reason,
          reference_id,
          balance_after
        )
        SELECT $1, $2, 'earned_rank', $3, $4,
               (SELECT ml_coins FROM gamification_system.user_stats WHERE user_id = $1)`,
        [userId, requirements.mlBonus, `Promoted to ${nextRank} rank`, result.rows[0].id]
      );

      await client.query('COMMIT');

      log.info(`User ${userId} promoted from ${currentRank} to ${nextRank}`);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error promoting user:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Get rank progression history for user
   */
  async getRankHistory(userId: string, dbClient?: PoolClient): Promise<UserRankData[]> {
    try {
      const query = `SELECT * FROM gamification_system.user_ranks
         WHERE user_id = $1
         ORDER BY achieved_at DESC`;
      const params = [userId];

      const result = dbClient
        ? await dbClient.query<UserRankData>(query, params)
        : await this.pool.query<UserRankData>(query, params);

      return result.rows;
    } catch (error) {
      log.error('Error getting rank history:', error);
      throw error;
    }
  }

  /**
   * Calculate rank progress percentage
   */
  calculateRankProgress(currentRank: string, userProgress: any): number {
    const currentIndex = this.RANK_ORDER.indexOf(currentRank);

    if (currentIndex === -1 || currentIndex === this.RANK_ORDER.length - 1) {
      return 100; // Maximum rank
    }

    const nextRank = this.RANK_ORDER[currentIndex + 1];
    const requirements = this.RANK_REQUIREMENTS[nextRank];

    // Calculate progress for each requirement
    const xpProgress = Math.min((userProgress.total_xp / requirements.xpRequired) * 100, 100);
    const modulesProgress = Math.min((userProgress.modules_completed / requirements.modulesRequired) * 100, 100);
    const coinsProgress = Math.min((userProgress.ml_coins_earned_total / requirements.mlCoinsThreshold) * 100, 100);
    const achievementsProgress =
      requirements.achievementsRequired > 0
        ? Math.min((userProgress.achievements_earned / requirements.achievementsRequired) * 100, 100)
        : 100;
    const scoreProgress = Math.min((userProgress.average_score / requirements.minimumScore) * 100, 100);

    // Average progress across all requirements
    const totalProgress = (xpProgress + modulesProgress + coinsProgress + achievementsProgress + scoreProgress) / 5;

    return Math.round(totalProgress);
  }

  /**
   * Get next rank for current rank
   */
  getNextRank(currentRank: string): string | null {
    const currentIndex = this.RANK_ORDER.indexOf(currentRank);

    if (currentIndex === -1 || currentIndex === this.RANK_ORDER.length - 1) {
      return null;
    }

    return this.RANK_ORDER[currentIndex + 1];
  }

  /**
   * Get multiplier for rank
   */
  getMultiplierForRank(rank: string): number {
    return this.RANK_REQUIREMENTS[rank]?.multiplier || 1.0;
  }
}
