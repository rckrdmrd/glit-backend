/**
 * Leaderboard Service - Business logic for leaderboards
 */

import { LeaderboardRepository } from './leaderboard.repository';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import { PoolClient } from 'pg';

export class LeaderboardService {
  constructor(private leaderboardRepository: LeaderboardRepository) {}

  async getGlobal(limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const leaderboard = await this.leaderboardRepository.getGlobalLeaderboard(limit, dbClient);
      return leaderboard.map((entry, index) => ({
        position: index + 1,
        userId: entry.user_id,
        name: entry.name,
        xp: entry.total_xp,
        mlCoins: entry.ml_coins,
        modulesCompleted: entry.modules_completed,
        achievementsEarned: entry.achievements_earned,
        streak: entry.current_streak,
        rank: entry.current_rank,
      }));
    } catch (error) {
      log.error('Error getting global leaderboard:', error);
      throw new AppError('Failed to get leaderboard', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  async getSchool(schoolId: string, limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const leaderboard = await this.leaderboardRepository.getSchoolLeaderboard(schoolId, limit, dbClient);
      return leaderboard.map((entry, index) => ({
        position: index + 1,
        userId: entry.user_id,
        name: entry.name,
        xp: entry.total_xp,
        mlCoins: entry.ml_coins,
        modulesCompleted: entry.modules_completed,
        rank: entry.current_rank,
      }));
    } catch (error) {
      log.error('Error getting school leaderboard:', error);
      throw new AppError('Failed to get leaderboard', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  async getClassroom(classroomId: string, limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const leaderboard = await this.leaderboardRepository.getClassroomLeaderboard(classroomId, limit, dbClient);
      return leaderboard.map((entry, index) => ({
        position: index + 1,
        userId: entry.user_id,
        name: entry.name,
        xp: entry.total_xp,
        mlCoins: entry.ml_coins,
        modulesCompleted: entry.modules_completed,
        rank: entry.current_rank,
      }));
    } catch (error) {
      log.error('Error getting classroom leaderboard:', error);
      throw new AppError('Failed to get leaderboard', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  async getWeekly(limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const leaderboard = await this.leaderboardRepository.getWeeklyLeaderboard(limit, dbClient);
      return leaderboard.map((entry, index) => ({
        position: index + 1,
        userId: entry.user_id,
        name: entry.name,
        weeklyXp: entry.xp,
        rank: entry.current_rank,
      }));
    } catch (error) {
      log.error('Error getting weekly leaderboard:', error);
      throw new AppError('Failed to get leaderboard', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  async getUserPosition(userId: string, dbClient?: PoolClient): Promise<any> {
    try {
      const position = await this.leaderboardRepository.getUserPosition(userId, dbClient);
      if (!position) {
        throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
      }
      return {
        userId: position.user_id,
        globalPosition: parseInt(position.global_position),
        totalUsers: parseInt(position.total_users),
        xp: position.total_xp,
        mlCoins: position.ml_coins_earned_total,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error getting user position:', error);
      throw new AppError('Failed to get position', 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
