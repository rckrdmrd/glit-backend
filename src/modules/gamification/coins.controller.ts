/**
 * Coins Controller
 *
 * HTTP request handlers for ML Coins endpoints.
 */

import { Response, NextFunction } from 'express';
import { CoinsService } from './coins.service';
import { EarnCoinsParams, SpendCoinsParams } from './coins.repository';
import { AuthRequest } from '../../shared/types';

export class CoinsController {
  constructor(private coinsService: CoinsService) {}

  /**
   * Get user's coin balance and history
   *
   * GET /api/gamification/coins/:userId
   */
  getBalance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const balance = await this.coinsService.getBalance(userId, req.dbClient);

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Award coins to user
   *
   * POST /api/gamification/coins/earn
   */
  earnCoins = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params: EarnCoinsParams = req.body;

      const result = await this.coinsService.earnCoins(params, req.dbClient);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Spend coins
   *
   * POST /api/gamification/coins/spend
   */
  spendCoins = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params: SpendCoinsParams = req.body;

      const result = await this.coinsService.spendCoins(params, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get transaction history
   *
   * GET /api/gamification/coins/transactions/:userId
   */
  getTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await this.coinsService.getTransactions(userId, limit, offset, req.dbClient);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit,
          offset,
          count: transactions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ML Coins leaderboard
   *
   * GET /api/gamification/coins/leaderboard
   */
  getLeaderboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;

      const leaderboard = await this.coinsService.getLeaderboard(limit, req.dbClient);

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get earning statistics
   *
   * GET /api/gamification/coins/stats/:userId
   */
  getEarningStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const stats = await this.coinsService.getEarningStats(userId, req.dbClient);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get economic metrics (admin only)
   *
   * GET /api/gamification/coins/metrics
   */
  getEconomicMetrics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await this.coinsService.getEconomicMetrics(req.dbClient);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };
}
