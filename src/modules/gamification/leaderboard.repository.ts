/**
 * Leaderboard Repository - Database access for leaderboards
 */

import { Pool, PoolClient } from 'pg';
import { log } from '../../shared/utils/logger';

export class LeaderboardRepository {
  constructor(private pool: Pool) {}

  async getGlobalLeaderboard(limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const client = dbClient || this.pool;
      const result = await client.query(
        `SELECT
          us.user_id,
          p.full_name as name,
          us.total_xp,
          us.ml_coins_earned_total as ml_coins,
          us.modules_completed,
          us.achievements_earned,
          us.current_streak,
          ur.current_rank
         FROM gamification_system.user_stats us
         JOIN auth_management.profiles p ON us.user_id = p.id
         LEFT JOIN gamification_system.user_ranks ur ON us.user_id = ur.user_id AND ur.is_current = true
         ORDER BY us.total_xp DESC, us.ml_coins_earned_total DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      log.error('Error getting global leaderboard:', error);
      throw error;
    }
  }

  async getSchoolLeaderboard(schoolId: string, limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const client = dbClient || this.pool;
      const result = await client.query(
        `SELECT
          us.user_id,
          p.full_name as name,
          us.total_xp,
          us.ml_coins_earned_total as ml_coins,
          us.modules_completed,
          ur.current_rank
         FROM gamification_system.user_stats us
         JOIN auth_management.profiles p ON us.user_id = p.id
         LEFT JOIN gamification_system.user_ranks ur ON us.user_id = ur.user_id AND ur.is_current = true
         WHERE p.school_id = $1
         ORDER BY us.total_xp DESC
         LIMIT $2`,
        [schoolId, limit]
      );
      return result.rows;
    } catch (error) {
      log.error('Error getting school leaderboard:', error);
      throw error;
    }
  }

  async getClassroomLeaderboard(classroomId: string, limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const client = dbClient || this.pool;
      const result = await client.query(
        `SELECT
          us.user_id,
          p.full_name as name,
          us.total_xp,
          us.ml_coins_earned_total as ml_coins,
          us.modules_completed,
          ur.current_rank
         FROM gamification_system.user_stats us
         JOIN auth_management.profiles p ON us.user_id = p.id
         LEFT JOIN gamification_system.user_ranks ur ON us.user_id = ur.user_id AND ur.is_current = true
         WHERE p.classroom_id = $1
         ORDER BY us.total_xp DESC
         LIMIT $2`,
        [classroomId, limit]
      );
      return result.rows;
    } catch (error) {
      log.error('Error getting classroom leaderboard:', error);
      throw error;
    }
  }

  async getWeeklyLeaderboard(limit: number = 100, dbClient?: PoolClient): Promise<any[]> {
    try {
      const client = dbClient || this.pool;
      const result = await client.query(
        `SELECT
          us.user_id,
          p.full_name as name,
          us.weekly_xp as xp,
          ur.current_rank
         FROM gamification_system.user_stats us
         JOIN auth_management.profiles p ON us.user_id = p.id
         LEFT JOIN gamification_system.user_ranks ur ON us.user_id = ur.user_id AND ur.is_current = true
         WHERE us.weekly_xp > 0
         ORDER BY us.weekly_xp DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      log.error('Error getting weekly leaderboard:', error);
      throw error;
    }
  }

  async getUserPosition(userId: string, dbClient?: PoolClient): Promise<any> {
    try {
      const client = dbClient || this.pool;
      const result = await client.query(
        `WITH ranked_users AS (
          SELECT
            user_id,
            total_xp,
            ml_coins_earned_total,
            ROW_NUMBER() OVER (ORDER BY total_xp DESC, ml_coins_earned_total DESC) as global_position,
            COUNT(*) OVER () as total_users
          FROM gamification_system.user_stats
        )
        SELECT * FROM ranked_users WHERE user_id = $1`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting user position:', error);
      throw error;
    }
  }
}
