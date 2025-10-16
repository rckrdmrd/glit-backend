/**
 * Activities Service
 *
 * Business logic for user activities tracking.
 * Provides aggregated view of user actions across the platform.
 *
 * @module activities.service
 */

import { Pool } from 'pg';
import { ActivitiesRepository, ActivityData } from './activities.repository';

export class ActivitiesService {
  private repository: ActivitiesRepository;

  constructor(pool: Pool) {
    this.repository = new ActivitiesRepository(pool);
  }

  /**
   * Get recent activities for a user
   *
   * @param userId - User ID
   * @param limit - Maximum number of activities to return (default: 10)
   * @returns List of recent activities
   */
  async getUserActivities(userId: string, limit: number = 10): Promise<ActivityData[]> {
    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return this.repository.getUserActivities(userId, limit);
  }

  /**
   * Get activity statistics for a user
   *
   * @param userId - User ID
   * @returns Activity statistics
   */
  async getActivityStats(userId: string): Promise<{
    totalActivities: number;
    exercisesCompleted: number;
    achievementsUnlocked: number;
    modulesCompleted: number;
    lastActivityAt: Date | null;
  }> {
    return this.repository.getActivityStats(userId);
  }

  /**
   * Get recent activities by type
   *
   * @param userId - User ID
   * @param type - Activity type filter
   * @param limit - Maximum number of activities
   * @returns Filtered activities
   */
  async getUserActivitiesByType(
    userId: string,
    type: 'exercise_completed' | 'achievement_unlocked' | 'module_completed',
    limit: number = 10
  ): Promise<ActivityData[]> {
    const activities = await this.getUserActivities(userId, limit * 2);
    return activities.filter(a => a.type === type).slice(0, limit);
  }
}
