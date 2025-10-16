/**
 * Missions Controller
 *
 * HTTP request handlers for missions endpoints.
 */

import { Response } from 'express';
import { MissionsService } from './missions.service';
import { AuthRequest } from '../../../shared/types';
import { log } from '../../../shared/utils/logger';

export class MissionsController {
  constructor(private service: MissionsService) {}

  /**
   * GET /api/gamification/missions/daily
   * Get user's daily missions
   */
  getDailyMissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const missions = await this.service.getDailyMissions(userId, req.dbClient);

      res.status(200).json({
        success: true,
        data: {
          missions,
          count: missions.length,
          type: 'daily',
          expiresAt: missions[0]?.end_date,
        },
      });
    } catch (error) {
      log.error('Error in getDailyMissions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get daily missions',
        },
      });
    }
  };

  /**
   * GET /api/gamification/missions/weekly
   * Get user's weekly missions
   */
  getWeeklyMissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const missions = await this.service.getWeeklyMissions(userId, req.dbClient);

      res.status(200).json({
        success: true,
        data: {
          missions,
          count: missions.length,
          type: 'weekly',
          expiresAt: missions[0]?.end_date,
        },
      });
    } catch (error) {
      log.error('Error in getWeeklyMissions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get weekly missions',
        },
      });
    }
  };

  /**
   * GET /api/gamification/missions/special
   * Get user's special missions
   */
  getSpecialMissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const missions = await this.service.getSpecialMissions(userId, req.dbClient);

      res.status(200).json({
        success: true,
        data: {
          missions,
          count: missions.length,
          type: 'special',
        },
      });
    } catch (error) {
      log.error('Error in getSpecialMissions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get special missions',
        },
      });
    }
  };

  /**
   * POST /api/gamification/missions/:id/claim
   * Claim mission rewards
   */
  claimRewards = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id: missionId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const result = await this.service.claimRewards(userId, missionId, req.dbClient);

      res.status(200).json({
        success: true,
        data: {
          mission: result.mission,
          rewards: result.rewards,
          message: 'Rewards claimed successfully',
        },
      });
    } catch (error: any) {
      log.error('Error in claimRewards:', error);

      if (error.message === 'Mission not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Mission not found',
          },
        });
        return;
      }

      if (
        error.message === 'Mission not completed' ||
        error.message === 'Rewards already claimed' ||
        error.message === 'Mission does not belong to user'
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to claim rewards',
        },
      });
    }
  };

  /**
   * GET /api/gamification/missions/:id/progress
   * Get mission progress
   */
  getMissionProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id: missionId } = req.params;

      const progress = await this.service.getMissionProgress(missionId, req.dbClient);

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      log.error('Error in getMissionProgress:', error);

      if (error.message === 'Mission not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Mission not found',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get mission progress',
        },
      });
    }
  };

  /**
   * POST /api/gamification/missions/:id/complete
   * Mark mission as complete (internal use)
   */
  completeMission = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id: missionId } = req.params;

      const mission = await this.service.completeMission(missionId, req.dbClient);

      res.status(200).json({
        success: true,
        data: {
          mission,
          message: 'Mission completed successfully',
        },
      });
    } catch (error: any) {
      log.error('Error in completeMission:', error);

      if (error.message === 'Mission not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Mission not found',
          },
        });
        return;
      }

      if (
        error.message === 'Mission already completed' ||
        error.message === 'Not all objectives completed'
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to complete mission',
        },
      });
    }
  };

  /**
   * GET /api/gamification/missions/user/:userId
   * Get all user missions (with filters)
   */
  getUserMissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { status, type, page, limit } = req.query;

      const filters: any = {};

      if (status) {
        filters.status = typeof status === 'string' ? status.split(',') : status;
      }

      if (type) {
        filters.type = typeof type === 'string' ? type.split(',') : type;
      }

      if (page) {
        filters.page = parseInt(page as string);
      }

      if (limit) {
        filters.limit = parseInt(limit as string);
      }

      const missions = await this.service.getUserMissions(userId, filters, req.dbClient);

      res.status(200).json({
        success: true,
        data: {
          missions,
          count: missions.length,
          filters,
        },
      });
    } catch (error) {
      log.error('Error in getUserMissions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user missions',
        },
      });
    }
  };

  /**
   * POST /api/gamification/missions/check/:userId
   * Check and update mission progress based on user actions
   */
  checkMissionsProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { actionType, amount } = req.body;

      if (!actionType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'actionType is required',
          },
        });
        return;
      }

      const updatedMissions = await this.service.updateMissionProgress(
        userId,
        actionType,
        amount || 1,
        req.dbClient
      );

      res.status(200).json({
        success: true,
        data: {
          updatedMissions,
          count: updatedMissions.length,
          actionType,
          amount: amount || 1,
        },
      });
    } catch (error) {
      log.error('Error in checkMissionsProgress:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check missions progress',
        },
      });
    }
  };

  /**
   * GET /api/gamification/missions/stats/:userId
   * Get user mission statistics
   */
  getUserMissionStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const stats = await this.service.getUserMissionStats(userId, req.dbClient);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      log.error('Error in getUserMissionStats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user mission stats',
        },
      });
    }
  };
}
