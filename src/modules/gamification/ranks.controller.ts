/**
 * Ranks Controller
 *
 * HTTP request handlers for Maya rank endpoints.
 */

import { Response, NextFunction } from 'express';
import { RanksService } from './ranks.service';
import { AuthRequest } from '../../shared/types';

export class RanksController {
  constructor(private ranksService: RanksService) {}

  /**
   * Get all Maya ranks with requirements
   *
   * GET /api/gamification/ranks
   */
  getAllRanks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ranks = await this.ranksService.getAllRanks();

      res.json({
        success: true,
        data: ranks,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get specific rank details
   *
   * GET /api/gamification/ranks/:rank
   */
  getRankDetails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rank } = req.params;

      const rankDetails = await this.ranksService.getRankDetails(rank);

      res.json({
        success: true,
        data: rankDetails,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's current rank and progress
   *
   * GET /api/gamification/ranks/user/:userId
   */
  getUserRank = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const rankInfo = await this.ranksService.getUserRankInfo(userId, req.dbClient);

      res.json({
        success: true,
        data: rankInfo,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user can be promoted
   *
   * POST /api/gamification/ranks/check-promotion/:userId
   */
  checkPromotion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const promotionCheck = await this.ranksService.checkPromotion(userId, req.dbClient);

      res.json({
        success: true,
        data: promotionCheck,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Promote user to next rank
   *
   * POST /api/gamification/ranks/promote/:userId
   */
  promoteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const promotion = await this.ranksService.promoteUser(userId, req.dbClient);

      res.status(200).json({
        success: true,
        data: {
          message: `User promoted to ${promotion.newRank.current_rank} rank!`,
          newRank: {
            rank: promotion.newRank.current_rank,
            achievedAt: promotion.newRank.achieved_at,
          },
          rewards: promotion.rewards,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get rank progression history
   *
   * GET /api/gamification/ranks/history/:userId
   */
  getRankHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const history = await this.ranksService.getRankHistory(userId, req.dbClient);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's current multiplier
   *
   * GET /api/gamification/ranks/multiplier/:userId
   */
  getMultiplier = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const multiplier = await this.ranksService.getCurrentMultiplier(userId, req.dbClient);

      res.json({
        success: true,
        data: { multiplier },
      });
    } catch (error) {
      next(error);
    }
  };
}
