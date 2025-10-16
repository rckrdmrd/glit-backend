/**
 * Missions Repository
 *
 * Database access layer for missions system.
 */

import { Pool, PoolClient } from 'pg';
import {
  Mission,
  MissionFilters,
  MissionObjective,
  MissionRewards,
  MissionStats,
  MissionType,
  ObjectiveType,
} from './missions.types';
import { log } from '../../../shared/utils/logger';

export class MissionsRepository {
  constructor(private pool: Pool) {}

  /**
   * Create new mission for user
   */
  async createMission(
    userId: string,
    templateId: string,
    title: string,
    description: string,
    missionType: MissionType,
    objectives: MissionObjective[],
    rewards: MissionRewards,
    endDate: Date,
    dbClient?: PoolClient
  ): Promise<Mission> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Mission>(
        `INSERT INTO gamification_system.missions (
          user_id,
          template_id,
          title,
          description,
          mission_type,
          objectives,
          rewards,
          status,
          progress,
          start_date,
          end_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 0, NOW(), $8)
        RETURNING *`,
        [userId, templateId, title, description, missionType, JSON.stringify(objectives), JSON.stringify(rewards), endDate]
      );

      return result.rows[0];
    } catch (error) {
      log.error('Error creating mission:', error);
      throw error;
    }
  }

  /**
   * Get mission by ID
   */
  async getMissionById(missionId: string, dbClient?: PoolClient): Promise<Mission | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Mission>(
        'SELECT * FROM gamification_system.missions WHERE id = $1',
        [missionId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting mission by ID:', error);
      throw error;
    }
  }

  /**
   * Get user missions with filters
   */
  async getUserMissions(
    userId: string,
    filters: MissionFilters = {},
    dbClient?: PoolClient
  ): Promise<Mission[]> {
    try {
      const client = dbClient || this.pool;

      let query = 'SELECT * FROM gamification_system.missions WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      // Filter by status
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query += ` AND status = ANY($${paramIndex})`;
          params.push(filters.status);
        } else {
          query += ` AND status = $${paramIndex}`;
          params.push(filters.status);
        }
        paramIndex++;
      }

      // Filter by type
      if (filters.type) {
        if (Array.isArray(filters.type)) {
          query += ` AND mission_type = ANY($${paramIndex})`;
          params.push(filters.type);
        } else {
          query += ` AND mission_type = $${paramIndex}`;
          params.push(filters.type);
        }
        paramIndex++;
      }

      // Order by created_at DESC
      query += ' ORDER BY created_at DESC';

      // Pagination
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }

      const result = await client.query<Mission>(query, params);

      return result.rows;
    } catch (error) {
      log.error('Error getting user missions:', error);
      throw error;
    }
  }

  /**
   * Get active missions by type
   */
  async getActiveMissionsByType(
    userId: string,
    missionType: MissionType,
    dbClient?: PoolClient
  ): Promise<Mission[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Mission>(
        `SELECT * FROM gamification_system.missions
         WHERE user_id = $1
         AND mission_type = $2
         AND status IN ('active', 'in_progress')
         AND end_date > NOW()
         ORDER BY created_at DESC`,
        [userId, missionType]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting active missions by type:', error);
      throw error;
    }
  }

  /**
   * Update mission progress
   */
  async updateMissionProgress(
    missionId: string,
    objectives: MissionObjective[],
    progress: number,
    status?: string,
    dbClient?: PoolClient
  ): Promise<Mission> {
    try {
      const client = dbClient || this.pool;

      let query = `
        UPDATE gamification_system.missions
        SET objectives = $1,
            progress = $2,
            updated_at = NOW()`;

      const params: any[] = [JSON.stringify(objectives), progress];
      let paramIndex = 3;

      if (status) {
        query += `, status = $${paramIndex}`;
        params.push(status);
        paramIndex++;

        if (status === 'completed') {
          query += `, completed_at = NOW()`;
        }
      }

      query += ` WHERE id = $${paramIndex} RETURNING *`;
      params.push(missionId);

      const result = await client.query<Mission>(query, params);

      return result.rows[0];
    } catch (error) {
      log.error('Error updating mission progress:', error);
      throw error;
    }
  }

  /**
   * Mark mission as claimed
   */
  async claimMission(missionId: string, dbClient?: PoolClient): Promise<Mission> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Mission>(
        `UPDATE gamification_system.missions
         SET status = 'claimed',
             claimed_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [missionId]
      );

      return result.rows[0];
    } catch (error) {
      log.error('Error claiming mission:', error);
      throw error;
    }
  }

  /**
   * Expire missions
   */
  async expireMissions(dbClient?: PoolClient): Promise<number> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `UPDATE gamification_system.missions
         SET status = 'expired'
         WHERE status IN ('active', 'in_progress')
         AND end_date < NOW()`,
        []
      );

      return result.rowCount || 0;
    } catch (error) {
      log.error('Error expiring missions:', error);
      throw error;
    }
  }

  /**
   * Delete expired missions (cleanup)
   */
  async deleteExpiredMissions(daysOld: number = 30, dbClient?: PoolClient): Promise<number> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `DELETE FROM gamification_system.missions
         WHERE status = 'expired'
         AND end_date < NOW() - INTERVAL '${daysOld} days'`,
        []
      );

      return result.rowCount || 0;
    } catch (error) {
      log.error('Error deleting expired missions:', error);
      throw error;
    }
  }

  /**
   * Get missions by template ID and type for user
   */
  async getMissionByTemplateAndType(
    userId: string,
    templateId: string,
    missionType: MissionType,
    dbClient?: PoolClient
  ): Promise<Mission | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Mission>(
        `SELECT * FROM gamification_system.missions
         WHERE user_id = $1
         AND template_id = $2
         AND mission_type = $3
         AND status IN ('active', 'in_progress', 'completed')
         AND end_date > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, templateId, missionType]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting mission by template and type:', error);
      throw error;
    }
  }

  /**
   * Get user mission statistics
   */
  async getUserMissionStats(userId: string, dbClient?: PoolClient): Promise<MissionStats> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          COUNT(*) as total_missions,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_missions,
          COUNT(*) FILTER (WHERE status = 'claimed') as claimed_missions,
          COUNT(*) FILTER (WHERE status = 'expired') as expired_missions,
          COALESCE(SUM((rewards->>'ml_coins')::int) FILTER (WHERE status = 'claimed'), 0) as total_ml_coins,
          COALESCE(SUM((rewards->>'xp')::int) FILTER (WHERE status = 'claimed'), 0) as total_xp
         FROM gamification_system.missions
         WHERE user_id = $1`,
        [userId]
      );

      const row = result.rows[0];

      const totalMissions = parseInt(row.total_missions) || 0;
      const completedMissions = parseInt(row.completed_missions) || 0;
      const claimedMissions = parseInt(row.claimed_missions) || 0;

      return {
        totalMissions,
        completedMissions,
        claimedMissions,
        expiredMissions: parseInt(row.expired_missions) || 0,
        totalRewardsEarned: {
          mlCoins: parseInt(row.total_ml_coins) || 0,
          xp: parseInt(row.total_xp) || 0,
        },
        completionRate: totalMissions > 0 ? (claimedMissions / totalMissions) * 100 : 0,
        dailyStreak: 0, // TODO: Calculate from login history
        weeklyStreak: 0, // TODO: Calculate from weekly completions
      };
    } catch (error) {
      log.error('Error getting user mission stats:', error);
      throw error;
    }
  }

  /**
   * Get all active users for cron job processing
   */
  async getActiveUserIds(dbClient?: PoolClient): Promise<string[]> {
    try {
      const client = dbClient || this.pool;

      // Get users who logged in within the last 30 days
      const result = await client.query<{ user_id: string }>(
        `SELECT DISTINCT user_id
         FROM gamification_system.user_stats
         WHERE last_login_at > NOW() - INTERVAL '30 days'`,
        []
      );

      return result.rows.map((row) => row.user_id);
    } catch (error) {
      log.error('Error getting active user IDs:', error);
      throw error;
    }
  }

  /**
   * Bulk create missions (for cron jobs)
   */
  async bulkCreateMissions(missions: any[], dbClient?: PoolClient): Promise<number> {
    const client = dbClient || (await this.pool.connect());
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      let count = 0;

      for (const mission of missions) {
        await client.query(
          `INSERT INTO gamification_system.missions (
            user_id,
            template_id,
            title,
            description,
            mission_type,
            objectives,
            rewards,
            status,
            progress,
            start_date,
            end_date
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 0, NOW(), $8)`,
          [
            mission.userId,
            mission.templateId,
            mission.title,
            mission.description,
            mission.missionType,
            JSON.stringify(mission.objectives),
            JSON.stringify(mission.rewards),
            mission.endDate,
          ]
        );
        count++;
      }

      await client.query('COMMIT');

      return count;
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error bulk creating missions:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }
}
