/**
 * Missions Service
 *
 * Business logic for missions system.
 */

import { PoolClient } from 'pg';
import { MissionsRepository } from './missions.repository';
import {
  Mission,
  MissionFilters,
  MissionProgressResponse,
  MissionStats,
  MissionType,
  ObjectiveType,
  UpdateProgressRequest,
} from './missions.types';
import {
  getRandomDailyTemplates,
  getRandomWeeklyTemplates,
  getTemplateById,
} from './missions.templates';
import { log } from '../../../shared/utils/logger';

export class MissionsService {
  constructor(private repository: MissionsRepository) {}

  /**
   * Get or create daily missions for user
   */
  async getDailyMissions(userId: string, dbClient?: PoolClient): Promise<Mission[]> {
    try {
      // Get existing active daily missions
      let missions = await this.repository.getActiveMissionsByType(userId, 'daily', dbClient);

      // If no missions or all expired, create new ones
      if (missions.length === 0) {
        missions = await this.createDailyMissions(userId, dbClient);
      }

      return missions;
    } catch (error) {
      log.error('Error getting daily missions:', error);
      throw error;
    }
  }

  /**
   * Get or create weekly missions for user
   */
  async getWeeklyMissions(userId: string, dbClient?: PoolClient): Promise<Mission[]> {
    try {
      // Get existing active weekly missions
      let missions = await this.repository.getActiveMissionsByType(userId, 'weekly', dbClient);

      // If no missions or all expired, create new ones
      if (missions.length === 0) {
        missions = await this.createWeeklyMissions(userId, dbClient);
      }

      return missions;
    } catch (error) {
      log.error('Error getting weekly missions:', error);
      throw error;
    }
  }

  /**
   * Get special missions for user
   */
  async getSpecialMissions(userId: string, dbClient?: PoolClient): Promise<Mission[]> {
    try {
      const missions = await this.repository.getActiveMissionsByType(userId, 'special', dbClient);
      return missions;
    } catch (error) {
      log.error('Error getting special missions:', error);
      throw error;
    }
  }

  /**
   * Create daily missions for user
   */
  async createDailyMissions(userId: string, dbClient?: PoolClient): Promise<Mission[]> {
    try {
      const templates = getRandomDailyTemplates(3);
      const missions: Mission[] = [];

      // Daily missions expire at end of day (23:59:59 UTC)
      const endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);

      for (const template of templates) {
        // Check if mission with this template already exists today
        const existing = await this.repository.getMissionByTemplateAndType(
          userId,
          template.id,
          'daily',
          dbClient
        );

        if (!existing) {
          const objectives = template.objectives.map((obj) => ({
            ...obj,
            current: 0,
          }));

          const mission = await this.repository.createMission(
            userId,
            template.id,
            template.title,
            template.description,
            'daily',
            objectives,
            template.rewards,
            endDate,
            dbClient
          );

          missions.push(mission);
        } else {
          missions.push(existing);
        }
      }

      log.info(`Created ${missions.length} daily missions for user ${userId}`);

      return missions;
    } catch (error) {
      log.error('Error creating daily missions:', error);
      throw error;
    }
  }

  /**
   * Create weekly missions for user
   */
  async createWeeklyMissions(userId: string, dbClient?: PoolClient): Promise<Mission[]> {
    try {
      const templates = getRandomWeeklyTemplates(5);
      const missions: Mission[] = [];

      // Weekly missions expire next Monday at 00:00 UTC
      const endDate = this.getNextMonday();

      for (const template of templates) {
        // Check if mission with this template already exists this week
        const existing = await this.repository.getMissionByTemplateAndType(
          userId,
          template.id,
          'weekly',
          dbClient
        );

        if (!existing) {
          const objectives = template.objectives.map((obj) => ({
            ...obj,
            current: 0,
          }));

          const mission = await this.repository.createMission(
            userId,
            template.id,
            template.title,
            template.description,
            'weekly',
            objectives,
            template.rewards,
            endDate,
            dbClient
          );

          missions.push(mission);
        } else {
          missions.push(existing);
        }
      }

      log.info(`Created ${missions.length} weekly missions for user ${userId}`);

      return missions;
    } catch (error) {
      log.error('Error creating weekly missions:', error);
      throw error;
    }
  }

  /**
   * Get mission progress
   */
  async getMissionProgress(missionId: string, dbClient?: PoolClient): Promise<MissionProgressResponse> {
    try {
      const mission = await this.repository.getMissionById(missionId, dbClient);

      if (!mission) {
        throw new Error('Mission not found');
      }

      const objectives = mission.objectives as any[];
      const totalObjectives = objectives.length;
      const objectivesCompleted = objectives.filter((obj) => obj.current >= obj.target).length;

      const percentage = Math.floor((objectivesCompleted / totalObjectives) * 100);

      const now = new Date();
      const timeRemaining = mission.end_date.getTime() - now.getTime();

      return {
        mission,
        percentage,
        objectivesCompleted,
        totalObjectives,
        canClaim: mission.status === 'completed' && mission.claimed_at === null,
        timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
      };
    } catch (error) {
      log.error('Error getting mission progress:', error);
      throw error;
    }
  }

  /**
   * Update mission progress based on user action
   */
  async updateMissionProgress(
    userId: string,
    actionType: ObjectiveType,
    amount: number = 1,
    dbClient?: PoolClient
  ): Promise<Mission[]> {
    try {
      // Get all active missions for user
      const missions = await this.repository.getUserMissions(
        userId,
        { status: ['active', 'in_progress'] },
        dbClient
      );

      const updatedMissions: Mission[] = [];

      for (const mission of missions) {
        let updated = false;
        const objectives = mission.objectives as any[];

        // Update objectives that match the action type
        for (const objective of objectives) {
          if (objective.type === actionType) {
            objective.current = Math.min(objective.current + amount, objective.target);
            updated = true;
          }
        }

        if (updated) {
          // Calculate overall progress
          const totalTargets = objectives.reduce((sum, obj) => sum + obj.target, 0);
          const totalCurrent = objectives.reduce((sum, obj) => sum + obj.current, 0);
          const progress = Math.floor((totalCurrent / totalTargets) * 100);

          // Check if all objectives are completed
          const allCompleted = objectives.every((obj) => obj.current >= obj.target);
          const newStatus = allCompleted ? 'completed' : 'in_progress';

          const updatedMission = await this.repository.updateMissionProgress(
            mission.id,
            objectives,
            progress,
            newStatus,
            dbClient
          );

          updatedMissions.push(updatedMission);

          log.info(
            `Updated mission ${mission.id} for user ${userId}: ${actionType} +${amount} (progress: ${progress}%)`
          );
        }
      }

      return updatedMissions;
    } catch (error) {
      log.error('Error updating mission progress:', error);
      throw error;
    }
  }

  /**
   * Complete mission manually
   */
  async completeMission(missionId: string, dbClient?: PoolClient): Promise<Mission> {
    try {
      const mission = await this.repository.getMissionById(missionId, dbClient);

      if (!mission) {
        throw new Error('Mission not found');
      }

      if (mission.status === 'completed' || mission.status === 'claimed') {
        throw new Error('Mission already completed');
      }

      // Verify all objectives are met
      const objectives = mission.objectives as any[];
      const allCompleted = objectives.every((obj) => obj.current >= obj.target);

      if (!allCompleted) {
        throw new Error('Not all objectives completed');
      }

      const updatedMission = await this.repository.updateMissionProgress(
        missionId,
        objectives,
        100,
        'completed',
        dbClient
      );

      log.info(`Mission ${missionId} marked as completed`);

      return updatedMission;
    } catch (error) {
      log.error('Error completing mission:', error);
      throw error;
    }
  }

  /**
   * Claim mission rewards
   */
  async claimRewards(
    userId: string,
    missionId: string,
    dbClient?: PoolClient
  ): Promise<{ mission: Mission; rewards: any }> {
    try {
      const mission = await this.repository.getMissionById(missionId, dbClient);

      if (!mission) {
        throw new Error('Mission not found');
      }

      if (mission.user_id !== userId) {
        throw new Error('Mission does not belong to user');
      }

      if (mission.status !== 'completed') {
        throw new Error('Mission not completed');
      }

      if (mission.claimed_at) {
        throw new Error('Rewards already claimed');
      }

      // Mark mission as claimed
      const updatedMission = await this.repository.claimMission(missionId, dbClient);

      log.info(`Rewards claimed for mission ${missionId} by user ${userId}`);

      return {
        mission: updatedMission,
        rewards: mission.rewards,
      };
    } catch (error) {
      log.error('Error claiming rewards:', error);
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
      return await this.repository.getUserMissions(userId, filters, dbClient);
    } catch (error) {
      log.error('Error getting user missions:', error);
      throw error;
    }
  }

  /**
   * Get user mission statistics
   */
  async getUserMissionStats(userId: string, dbClient?: PoolClient): Promise<MissionStats> {
    try {
      return await this.repository.getUserMissionStats(userId, dbClient);
    } catch (error) {
      log.error('Error getting user mission stats:', error);
      throw error;
    }
  }

  /**
   * Check and auto-complete missions
   */
  async checkMissionsProgress(userId: string, dbClient?: PoolClient): Promise<Mission[]> {
    try {
      const missions = await this.repository.getUserMissions(
        userId,
        { status: ['active', 'in_progress'] },
        dbClient
      );

      const completedMissions: Mission[] = [];

      for (const mission of missions) {
        const objectives = mission.objectives as any[];
        const allCompleted = objectives.every((obj) => obj.current >= obj.target);

        if (allCompleted && mission.status !== 'completed') {
          const updatedMission = await this.repository.updateMissionProgress(
            mission.id,
            objectives,
            100,
            'completed',
            dbClient
          );

          completedMissions.push(updatedMission);
        }
      }

      return completedMissions;
    } catch (error) {
      log.error('Error checking missions progress:', error);
      throw error;
    }
  }

  /**
   * Expire old missions
   */
  async expireMissions(dbClient?: PoolClient): Promise<number> {
    try {
      return await this.repository.expireMissions(dbClient);
    } catch (error) {
      log.error('Error expiring missions:', error);
      throw error;
    }
  }

  /**
   * Helper: Get next Monday at 00:00 UTC
   */
  private getNextMonday(): Date {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);

    return nextMonday;
  }
}
