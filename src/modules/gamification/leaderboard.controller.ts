/**
 * Leaderboard Controller - HTTP handlers for leaderboard endpoints
 */

import { Response, NextFunction } from 'express';
import { LeaderboardService } from './leaderboard.service';
import { AuthRequest } from '../../shared/types';

export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  getGlobal = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await this.leaderboardService.getGlobal(limit, req.dbClient);
      res.json({ success: true, data: leaderboard });
    } catch (error) {
      next(error);
    }
  };

  getSchool = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { schoolId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await this.leaderboardService.getSchool(schoolId, limit, req.dbClient);
      res.json({ success: true, data: leaderboard });
    } catch (error) {
      next(error);
    }
  };

  getClassroom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { classroomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await this.leaderboardService.getClassroom(classroomId, limit, req.dbClient);
      res.json({ success: true, data: leaderboard });
    } catch (error) {
      next(error);
    }
  };

  getWeekly = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await this.leaderboardService.getWeekly(limit, req.dbClient);
      res.json({ success: true, data: leaderboard });
    } catch (error) {
      next(error);
    }
  };

  getUserPosition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const position = await this.leaderboardService.getUserPosition(userId, req.dbClient);
      res.json({ success: true, data: position });
    } catch (error) {
      next(error);
    }
  };
}
