/**
 * Ranks Service
 *
 * Business logic for Maya rank operations.
 */

import { RanksRepository, RankRequirements, UserRankData } from './ranks.repository';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import { PoolClient, Pool } from 'pg';
import { AchievementsService } from './achievements.service';

export class RanksService {
  private achievementsService: AchievementsService | null = null;

  constructor(private ranksRepository: RanksRepository, private pool?: Pool) {
    if (pool) {
      this.achievementsService = new AchievementsService(pool);
    }
  }

  /**
   * Get all Maya rank requirements
   */
  async getAllRanks(): Promise<RankRequirements[]> {
    try {
      return this.ranksRepository.getRankRequirements();
    } catch (error) {
      log.error('Error getting all ranks:', error);
      throw new AppError('Failed to get rank requirements', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get specific rank requirements
   */
  async getRankDetails(rank: string): Promise<RankRequirements> {
    try {
      const rankRequirements = this.ranksRepository.getRankRequirement(rank);

      if (!rankRequirements) {
        throw new AppError('Rank not found', 404, ErrorCode.NOT_FOUND);
      }

      return rankRequirements;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error getting rank details:', error);
      throw new AppError('Failed to get rank details', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get user's current rank and progress
   */
  async getUserRankInfo(userId: string, dbClient?: PoolClient): Promise<any> {
    try {
      const userRank = await this.ranksRepository.getUserRank(userId, dbClient);

      if (!userRank) {
        throw new AppError('User rank not found', 404, ErrorCode.NOT_FOUND);
      }

      const progress = await this.ranksRepository.getUserProgress(userId, dbClient);
      const currentRankReqs = this.ranksRepository.getRankRequirement(userRank.current_rank);
      const nextRank = this.ranksRepository.getNextRank(userRank.current_rank);
      const nextRankReqs = nextRank ? this.ranksRepository.getRankRequirement(nextRank) : null;

      const rankProgress = this.ranksRepository.calculateRankProgress(userRank.current_rank, progress);

      return {
        currentRank: {
          rank: userRank.current_rank,
          multiplier: currentRankReqs?.multiplier || 1.0,
          achievedAt: userRank.achieved_at,
          mlCoinsBonus: userRank.ml_coins_bonus,
          certificateUrl: userRank.certificate_url,
          badgeUrl: userRank.badge_url,
        },
        nextRank: nextRankReqs
          ? {
              rank: nextRankReqs.rank,
              requirements: {
                xpRequired: nextRankReqs.xpRequired,
                modulesRequired: nextRankReqs.modulesRequired,
                mlCoinsThreshold: nextRankReqs.mlCoinsThreshold,
                achievementsRequired: nextRankReqs.achievementsRequired,
                minimumScore: nextRankReqs.minimumScore,
              },
              rewards: {
                multiplier: nextRankReqs.multiplier,
                mlBonus: nextRankReqs.mlBonus,
              },
            }
          : null,
        progress: {
          percentage: rankProgress,
          currentXP: progress.total_xp,
          currentModules: progress.modules_completed,
          currentMLCoins: progress.ml_coins_earned_total,
          currentAchievements: progress.achievements_earned,
          currentScore: progress.average_score,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error getting user rank info:', error);
      throw new AppError('Failed to get user rank info', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Check if user can be promoted
   */
  async checkPromotion(userId: string, dbClient?: PoolClient): Promise<{
    canPromote: boolean;
    currentRank: string;
    nextRank: string | null;
    missingRequirements: string[];
  }> {
    try {
      return await this.ranksRepository.checkPromotion(userId, dbClient);
    } catch (error) {
      log.error('Error checking promotion:', error);
      throw new AppError('Failed to check promotion eligibility', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Promote user to next rank
   */
  async promoteUser(userId: string, dbClient?: PoolClient): Promise<{
    newRank: UserRankData;
    rewards: {
      mlCoins: number;
      multiplier: number;
    };
  }> {
    try {
      // Check if promotion is possible
      const promotionCheck = await this.ranksRepository.checkPromotion(userId, dbClient);

      if (!promotionCheck.canPromote) {
        throw new AppError(
          `Cannot promote user: ${promotionCheck.missingRequirements.join(', ')}`,
          400,
          'PROMOTION_REQUIREMENTS_NOT_MET'
        );
      }

      // Perform promotion
      const newRank = await this.ranksRepository.promoteUser(userId, dbClient);
      const rankRequirements = this.ranksRepository.getRankRequirement(newRank.current_rank);

      log.info(`User ${userId} successfully promoted to ${newRank.current_rank}`);

      // Check for rank-based achievements after promotion
      if (this.achievementsService) {
        try {
          const unlockedAchievements = await this.achievementsService.checkAndUnlockAchievements(
            userId,
            {
              // Context for rank up achievements
            }
          );

          if (unlockedAchievements.length > 0) {
            log.info(`User ${userId} unlocked ${unlockedAchievements.length} rank achievements`);
          }
        } catch (error) {
          log.error('Error checking rank achievements after promotion:', error);
          // Don't fail promotion if achievement check fails
        }
      }

      return {
        newRank,
        rewards: {
          mlCoins: newRank.ml_coins_bonus,
          multiplier: rankRequirements?.multiplier || 1.0,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.message.includes('Cannot promote user')) {
          throw new AppError(error.message, 400, 'PROMOTION_REQUIREMENTS_NOT_MET');
        }
        if (error.message.includes('Already at maximum rank')) {
          throw new AppError('User is already at maximum rank', 400, 'MAX_RANK_REACHED');
        }
      }
      log.error('Error promoting user:', error);
      throw new AppError('Failed to promote user', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get rank progression history
   */
  async getRankHistory(userId: string, dbClient?: PoolClient): Promise<any[]> {
    try {
      const history = await this.ranksRepository.getRankHistory(userId, dbClient);

      return history.map((rank) => ({
        rank: rank.current_rank,
        previousRank: rank.previous_rank,
        achievedAt: rank.achieved_at,
        mlCoinsBonus: rank.ml_coins_bonus,
        modulesCompleted: rank.modules_completed_for_rank,
        xpEarned: rank.xp_earned_for_rank,
      }));
    } catch (error) {
      log.error('Error getting rank history:', error);
      throw new AppError('Failed to get rank history', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get multiplier for user's current rank
   */
  async getCurrentMultiplier(userId: string, dbClient?: PoolClient): Promise<number> {
    try {
      const userRank = await this.ranksRepository.getUserRank(userId, dbClient);

      if (!userRank) {
        return 1.0; // Default multiplier
      }

      return this.ranksRepository.getMultiplierForRank(userRank.current_rank);
    } catch (error) {
      log.error('Error getting current multiplier:', error);
      return 1.0; // Return default on error
    }
  }

  /**
   * Auto-check and promote if eligible
   * Should be called after significant progress events
   */
  async autoCheckPromotion(userId: string, dbClient?: PoolClient): Promise<{
    promoted: boolean;
    newRank?: string;
    previousRank?: string;
    rewards?: any;
  }> {
    try {
      const promotionCheck = await this.ranksRepository.checkPromotion(userId, dbClient);

      if (promotionCheck.canPromote) {
        const promotion = await this.promoteUser(userId, dbClient);
        return {
          promoted: true,
          newRank: promotion.newRank.current_rank,
          previousRank: promotion.newRank.previous_rank || undefined,
          rewards: promotion.rewards,
        };
      }

      return { promoted: false };
    } catch (error) {
      log.error('Error in auto-check promotion:', error);
      return { promoted: false };
    }
  }
}
