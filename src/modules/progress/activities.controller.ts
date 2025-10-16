/**
 * Activities Controller
 *
 * HTTP request handlers for activities endpoints.
 *
 * @module activities.controller
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { ActivitiesService } from './activities.service';

export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  /**
   * GET /api/progress/activities/:userId
   * Get recent activities for a user
   */
  getUserActivities = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const activities = await this.activitiesService.getUserActivities(userId, limit);

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/progress/activities/:userId/stats
   * Get activity statistics for a user
   */
  getActivityStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const stats = await this.activitiesService.getActivityStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/progress/activities/:userId/by-type/:type
   * Get activities filtered by type
   */
  getUserActivitiesByType = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, type } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const validTypes = ['exercise_completed', 'achievement_unlocked', 'module_completed'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid activity type. Must be one of: ${validTypes.join(', ')}`
          }
        });
      }

      const activities = await this.activitiesService.getUserActivitiesByType(
        userId,
        type as any,
        limit
      );

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  };
}
