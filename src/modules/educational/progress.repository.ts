/**
 * Progress Repository
 * Data access layer for student progress tracking.
 */

import { Pool } from 'pg';
import { UserProgressOverview, ModuleProgressDetail, ExerciseAttempt, LearningSession } from './educational.types';

export class ProgressRepository {
  constructor(private pool: Pool) {}

  /**
   * Get user's overall progress
   */
  async getUserProgress(userId: string): Promise<UserProgressOverview | null> {
    const overallQuery = `
      SELECT
        COUNT(DISTINCT mp.module_id) as "completedModules",
        SUM(mp.completed_exercises) as "completedExercises",
        (SELECT COUNT(*) FROM educational_content.modules WHERE is_published = true) as "totalModules",
        (SELECT COUNT(*) FROM educational_content.exercises WHERE is_active = true) as "totalExercises"
      FROM progress_tracking.module_progress mp
      WHERE mp.user_id = $1
    `;

    const moduleProgressQuery = `
      SELECT
        m.id as "moduleId",
        m.title as "moduleName",
        mp.total_exercises as "totalExercises",
        mp.completed_exercises as "completedExercises",
        mp.progress_percentage as "progressPercentage",
        mp.average_score as "averageScore",
        EXTRACT(EPOCH FROM mp.time_spent) / 60 as "timeSpent",
        mp.last_accessed_at as "lastActivityAt"
      FROM progress_tracking.module_progress mp
      JOIN educational_content.modules m ON mp.module_id = m.id
      WHERE mp.user_id = $1
      ORDER BY m.order_index
    `;

    const streakQuery = `
      SELECT
        current_streak as "currentStreak",
        max_streak as "longestStreak",
        last_login_at as "lastStudyDate"
      FROM gamification_system.user_stats
      WHERE user_id = $1
    `;

    const [overallResult, moduleResult, streakResult] = await Promise.all([
      this.pool.query(overallQuery, [userId]),
      this.pool.query(moduleProgressQuery, [userId]),
      this.pool.query(streakQuery, [userId])
    ]);

    const overall = overallResult.rows[0];
    const overallPercentage = overall.totalExercises > 0
      ? Math.round((overall.completedExercises / overall.totalExercises) * 100)
      : 0;

    return {
      userId,
      overallProgress: {
        totalModules: overall.totalModules,
        completedModules: overall.completedModules,
        totalExercises: overall.totalExercises,
        completedExercises: overall.completedExercises,
        overallPercentage
      },
      moduleProgress: moduleResult.rows,
      recentActivity: [], // Would fetch from activity log
      studyStreak: streakResult.rows[0] || { currentStreak: 0, longestStreak: 0, lastStudyDate: new Date() }
    };
  }

  /**
   * Get module progress detail
   */
  async getModuleProgress(userId: string, moduleId: string): Promise<ModuleProgressDetail | null> {
    const query = `
      SELECT
        mp.user_id as "userId",
        mp.module_id as "moduleId",
        mp.started_at as "startedAt",
        mp.completed_at as "completedAt",
        mp.progress_percentage as "progressPercentage",
        mp.total_exercises as "totalExercises",
        mp.completed_exercises as "completedExercises",
        mp.average_score as "averageScore",
        EXTRACT(EPOCH FROM mp.time_spent) as "totalTimeSpent",
        mp.updated_at as "updatedAt"
      FROM progress_tracking.module_progress mp
      WHERE mp.user_id = $1 AND mp.module_id = $2
    `;

    const exercisesQuery = `
      SELECT
        e.id as "exerciseId",
        e.title as "exerciseTitle",
        COUNT(ea.id) as attempts,
        MAX(ea.score) as "bestScore",
        AVG(ea.score) as "averageScore",
        BOOL_OR(ea.is_correct) as completed,
        BOOL_OR(ea.score = 100) as "perfectScore",
        SUM(ea.time_spent_seconds) as "timeSpent",
        MAX(ea.submitted_at) as "lastAttemptedAt"
      FROM educational_content.exercises e
      LEFT JOIN progress_tracking.exercise_attempts ea
        ON e.id = ea.exercise_id AND ea.user_id = $1
      WHERE e.module_id = $2
      GROUP BY e.id, e.title
      ORDER BY e.order_index
    `;

    const [progressResult, exercisesResult] = await Promise.all([
      this.pool.query(query, [userId, moduleId]),
      this.pool.query(exercisesQuery, [userId, moduleId])
    ]);

    if (progressResult.rows.length === 0) return null;

    return {
      ...progressResult.rows[0],
      exerciseProgress: exercisesResult.rows,
      strengths: [], // Would analyze performance
      weaknesses: []
    };
  }

  /**
   * Get exercise attempts
   */
  async getExerciseAttempts(
    userId: string,
    filters?: { exerciseId?: string; moduleId?: string }
  ): Promise<ExerciseAttempt[]> {
    let query = `
      SELECT
        ea.id,
        ea.user_id as "userId",
        ea.exercise_id as "exerciseId",
        e.title as "exerciseTitle",
        ea.score,
        e.max_points as "maxScore",
        ROUND((ea.score::numeric / e.max_points) * 100, 2) as percentage,
        ea.time_spent_seconds as "timeSpent",
        ea.hints_used as "hintsUsed",
        ea.comodines_used as "powerupsUsed",
        ea.submitted_answers as answers,
        ea.is_correct as "isPerfect",
        ea.ml_coins_earned as "mlCoinsEarned",
        ea.xp_earned as "xpEarned",
        ROW_NUMBER() OVER (PARTITION BY ea.exercise_id ORDER BY ea.submitted_at) as "attemptNumber",
        ea.submitted_at as "startedAt",
        ea.submitted_at as "completedAt"
      FROM progress_tracking.exercise_attempts ea
      JOIN educational_content.exercises e ON ea.exercise_id = e.id
      WHERE ea.user_id = $1
    `;

    const params: any[] = [userId];

    if (filters?.exerciseId) {
      params.push(filters.exerciseId);
      query += ` AND ea.exercise_id = $${params.length}`;
    }

    if (filters?.moduleId) {
      params.push(filters.moduleId);
      query += ` AND e.module_id = $${params.length}`;
    }

    query += ' ORDER BY ea.submitted_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Create or update module progress
   */
  async upsertModuleProgress(userId: string, moduleId: string, exerciseCompleted: boolean): Promise<void> {
    const query = `
      INSERT INTO progress_tracking.module_progress (
        user_id, module_id, started_at, completed_exercises, total_exercises, progress_percentage
      )
      SELECT
        $1, $2, NOW(),
        CASE WHEN $3 THEN 1 ELSE 0 END,
        (SELECT COUNT(*) FROM educational_content.exercises WHERE module_id = $2 AND is_active = true),
        CASE
          WHEN $3 THEN ROUND((1.0 / (SELECT COUNT(*) FROM educational_content.exercises WHERE module_id = $2)) * 100)
          ELSE 0
        END
      ON CONFLICT (user_id, module_id)
      DO UPDATE SET
        completed_exercises = module_progress.completed_exercises + CASE WHEN $3 THEN 1 ELSE 0 END,
        progress_percentage = ROUND((module_progress.completed_exercises + CASE WHEN $3 THEN 1 ELSE 0 END)::numeric / module_progress.total_exercises * 100),
        last_accessed_at = NOW(),
        status = CASE
          WHEN (module_progress.completed_exercises + CASE WHEN $3 THEN 1 ELSE 0 END) >= module_progress.total_exercises THEN 'completed'::progress_status
          ELSE 'in_progress'::progress_status
        END
    `;

    await this.pool.query(query, [userId, moduleId, exerciseCompleted]);
  }
}
