/**
 * Gamification Controller
 *
 * HTTP request handlers for gamification endpoints.
 */

import { Response, NextFunction } from 'express';
import { GamificationService } from './gamification.service';
import { AddMLCoinsDto, UnlockAchievementDto } from './gamification.types';
import { AuthRequest } from '../../shared/types';

export class GamificationController {
  constructor(private gamificationService: GamificationService) {}

  /**
   * Get user statistics
   *
   * GET /api/gamification/stats/:userId
   */
  getUserStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const stats = await this.gamificationService.getUserStats(userId, req.dbClient);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add ML Coins to user
   *
   * POST /api/gamification/coins/add
   */
  addMLCoins = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const addCoinsDto: AddMLCoinsDto = req.body;

      const result = await this.gamificationService.addMLCoins(addCoinsDto, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ML Coins transactions
   *
   * GET /api/gamification/transactions/:userId
   */
  getTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const transactions = await this.gamificationService.getMLCoinsTransactions(
        userId,
        limit,
        req.dbClient
      );

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all achievements
   *
   * GET /api/gamification/achievements
   */
  getAllAchievements = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const achievements = await this.gamificationService.getAllAchievements();

      res.json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user achievements
   *
   * GET /api/gamification/achievements/:userId
   */
  getUserAchievements = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const achievements = await this.gamificationService.getUserAchievements(userId, req.dbClient);

      res.json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Unlock achievement for user
   *
   * POST /api/gamification/achievements/unlock
   */
  unlockAchievement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const unlockDto: UnlockAchievementDto = req.body;

      const result = await this.gamificationService.unlockAchievement(unlockDto, req.dbClient);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
