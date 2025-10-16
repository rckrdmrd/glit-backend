/**
 * Progress Controller
 * HTTP request handlers for progress tracking endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { ProgressService } from './progress.service';

export class ProgressController {
  constructor(private progressService: ProgressService) {}

  /**
   * GET /api/progress/user/:userId
   */
  getUserProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const progress = await this.progressService.getUserProgress(userId);

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/progress/user/:userId/module/:moduleId
   */
  getModuleProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, moduleId } = req.params;

      const progress = await this.progressService.getModuleProgress(userId, moduleId);

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/progress/attempts/:userId
   */
  getExerciseAttempts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const filters = {
        exerciseId: req.query.exerciseId as string,
        moduleId: req.query.moduleId as string
      };

      const attempts = await this.progressService.getExerciseAttempts(userId, filters);

      res.json({
        success: true,
        data: attempts
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/progress/user/:userId/dashboard
   */
  getUserDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const progress = await this.progressService.getUserProgress(userId);

      // Transform into dashboard format
      const dashboard = {
        currentModule: progress.moduleProgress[0] || null,
        recentActivities: progress.recentActivity,
        upcomingExercises: [], // Would fetch next exercises
        progressCharts: {
          moduleProgress: progress.moduleProgress.map(m => ({
            moduleId: m.moduleId,
            percentage: m.progressPercentage
          })),
          scoresTrend: [],
          timeSpent: []
        },
        stats: {
          mlCoins: 0, // Would fetch from gamification
          totalXP: 0,
          currentRank: 'nacom',
          streakDays: progress.studyStreak.currentStreak,
          exercisesCompleted: progress.overallProgress.completedExercises,
          averageScore: 0
        }
      };

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  };
}
