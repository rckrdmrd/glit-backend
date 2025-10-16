/**
 * Activities Repository
 *
 * Data access layer for user activities and recent actions.
 * Aggregates activity data from multiple sources (exercises, achievements, etc.)
 *
 * @module activities.repository
 */

import { Pool } from 'pg';

export interface ActivityData {
  id: string;
  type: 'exercise_completed' | 'achievement_unlocked' | 'streak_milestone' | 'level_up' | 'module_completed';
  title: string;
  description: string;
  timestamp: Date;
  metadata: {
    xp?: number;
    ml?: number;
    exerciseName?: string;
    moduleName?: string;
    achievementName?: string;
    streakDays?: number;
    score?: number;
  };
  category: string;
}

export class ActivitiesRepository {
  constructor(private pool: Pool) {}

  /**
   * Get recent activities for a user
   * Aggregates data from multiple tables
   */
  async getUserActivities(userId: string, limit: number = 10): Promise<ActivityData[]> {
    const query = `
      -- Exercise completions
      (
        SELECT
          es.id::text,
          'exercise_completed' as type,
          'Ejercicio Completado' as title,
          'Completaste "' || e.title || '"' as description,
          es.submitted_at as timestamp,
          jsonb_build_object(
            'xp', es.score,
            'exerciseName', e.title,
            'moduleName', m.title,
            'score', es.score
          ) as metadata,
          'education' as category
        FROM progress_tracking.exercise_submissions es
        JOIN educational_content.exercises e ON es.exercise_id = e.id
        JOIN educational_content.modules m ON e.module_id = m.id
        WHERE es.user_id = $1
        AND es.submitted_at IS NOT NULL
        ORDER BY es.submitted_at DESC
        LIMIT $2
      )
      UNION ALL
      -- Achievement unlocks
      (
        SELECT
          ua.id::text,
          'achievement_unlocked' as type,
          'Logro Desbloqueado' as title,
          a.description,
          ua.completed_at as timestamp,
          jsonb_build_object(
            'achievementName', a.name,
            'xp', (a.rewards->>'xp')::int
          ) as metadata,
          'achievement' as category
        FROM gamification_system.user_achievements ua
        JOIN gamification_system.achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = $1
        AND ua.completed_at IS NOT NULL
        ORDER BY ua.completed_at DESC
        LIMIT $2
      )
      UNION ALL
      -- Module completions
      (
        SELECT
          mp.id::text,
          'module_completed' as type,
          'Módulo Completado' as title,
          'Completaste el módulo "' || m.title || '"' as description,
          mp.completed_at as timestamp,
          jsonb_build_object(
            'moduleName', m.title,
            'xp', m.xp_reward,
            'ml', m.ml_coins_reward
          ) as metadata,
          'education' as category
        FROM progress_tracking.module_progress mp
        JOIN educational_content.modules m ON mp.module_id = m.id
        WHERE mp.user_id = $1
        AND mp.completed_at IS NOT NULL
        AND mp.progress_percentage >= 100
        ORDER BY mp.completed_at DESC
        LIMIT $2
      )
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [userId, limit]);
    return result.rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Get activity statistics for a user
   */
  async getActivityStats(userId: string): Promise<{
    totalActivities: number;
    exercisesCompleted: number;
    achievementsUnlocked: number;
    modulesCompleted: number;
    lastActivityAt: Date | null;
  }> {
    const query = `
      SELECT
        (
          SELECT COUNT(*)
          FROM progress_tracking.exercise_submissions
          WHERE user_id = $1
        ) as exercises_completed,
        (
          SELECT COUNT(*)
          FROM gamification_system.user_achievements
          WHERE user_id = $1 AND completed_at IS NOT NULL
        ) as achievements_unlocked,
        (
          SELECT COUNT(*)
          FROM progress_tracking.module_progress
          WHERE user_id = $1 AND completed_at IS NOT NULL
        ) as modules_completed,
        (
          SELECT MAX(timestamp) FROM (
            SELECT MAX(submitted_at) as timestamp FROM progress_tracking.exercise_submissions WHERE user_id = $1
            UNION ALL
            SELECT MAX(completed_at) as timestamp FROM gamification_system.user_achievements WHERE user_id = $1
            UNION ALL
            SELECT MAX(completed_at) as timestamp FROM progress_tracking.module_progress WHERE user_id = $1
          ) t
        ) as last_activity_at
    `;

    const result = await this.pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalActivities: (
        parseInt(row.exercises_completed || 0) +
        parseInt(row.achievements_unlocked || 0) +
        parseInt(row.modules_completed || 0)
      ),
      exercisesCompleted: parseInt(row.exercises_completed || 0),
      achievementsUnlocked: parseInt(row.achievements_unlocked || 0),
      modulesCompleted: parseInt(row.modules_completed || 0),
      lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : null,
    };
  }
}
