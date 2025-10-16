/**
 * Exercises Repository
 *
 * Data access layer for exercises.
 * Handles all database operations for exercises table.
 */

import { Pool } from 'pg';
import {
  ExerciseResponse,
  CreateExerciseDto,
  ExerciseSummary,
  PaginationQuery,
  FilterOptions
} from './educational.types';

export class ExercisesRepository {
  constructor(private pool: Pool) {}

  /**
   * Get all exercises with filtering and pagination
   */
  async getAllExercises(
    filters?: FilterOptions,
    pagination?: PaginationQuery
  ): Promise<{ exercises: ExerciseResponse[]; total: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        e.id,
        e.module_id as "moduleId",
        e.title,
        e.description,
        e.exercise_type as "exerciseType",
        e.difficulty_level as difficulty,
        e.estimated_time_minutes as "estimatedTimeMinutes",
        e.max_points as "pointsReward",
        e.ml_coins_reward as "mlCoinsReward",
        e.xp_reward as "xpReward",
        e.is_active as "isActive",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM educational_content.exercises e
      WHERE e.is_active = true
    `;

    const params: any[] = [];

    if (filters?.moduleId) {
      params.push(filters.moduleId);
      query += ` AND e.module_id = $${params.length}`;
    }

    if (filters?.type) {
      params.push(filters.type);
      query += ` AND e.exercise_type = $${params.length}`;
    }

    if (filters?.difficulty) {
      params.push(filters.difficulty);
      query += ` AND e.difficulty_level = $${params.length}`;
    }

    query += `
      ORDER BY e.module_id, e.order_index
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const [exercisesResult, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query('SELECT COUNT(*) FROM educational_content.exercises WHERE is_active = true')
    ]);

    return {
      exercises: exercisesResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Get exercise by ID with full content
   */
  async getExerciseById(exerciseId: string, userId?: string): Promise<ExerciseResponse | null> {
    const query = `
      SELECT
        e.id,
        e.module_id as "moduleId",
        e.title,
        e.description,
        e.instructions,
        e.exercise_type as "exerciseType",
        e.difficulty_level as difficulty,
        e.estimated_time_minutes as "estimatedTimeMinutes",
        e.max_points as "pointsReward",
        e.ml_coins_reward as "mlCoinsReward",
        e.xp_reward as "xpReward",
        e.content,
        e.hints,
        e.comodines_allowed as "comodinesAllowed",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM educational_content.exercises e
      WHERE e.id = $1
    `;

    const result = await this.pool.query(query, [exerciseId]);
    if (result.rows.length === 0) return null;

    const exercise = result.rows[0];

    // Get user progress if userId provided
    if (userId) {
      const progressQuery = `
        SELECT
          COUNT(*) as attempts,
          MAX(score) as "bestScore",
          BOOL_OR(is_correct) as completed,
          MAX(submitted_at) as "lastAttemptedAt"
        FROM progress_tracking.exercise_attempts
        WHERE exercise_id = $1 AND user_id = $2
      `;

      const progressResult = await this.pool.query(progressQuery, [exerciseId, userId]);
      exercise.userProgress = progressResult.rows[0];
    }

    return {
      ...exercise,
      availablePowerups: exercise.comodinesAllowed || []
    };
  }

  /**
   * Create new exercise
   */
  async createExercise(
    exerciseData: CreateExerciseDto,
    createdBy: string
  ): Promise<ExerciseResponse> {
    const query = `
      INSERT INTO educational_content.exercises (
        module_id, title, description, instructions, exercise_type,
        order_index, config, content, solution, rubric, auto_gradable,
        difficulty_level, max_points, passing_score, estimated_time_minutes,
        time_limit_minutes, max_attempts, hints, comodines_allowed,
        xp_reward, ml_coins_reward, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING
        id, module_id as "moduleId", title, exercise_type as "exerciseType",
        difficulty_level as difficulty, max_points as "pointsReward",
        ml_coins_reward as "mlCoinsReward", xp_reward as "xpReward",
        created_at as "createdAt"
    `;

    const values = [
      exerciseData.moduleId,
      exerciseData.title,
      exerciseData.description,
      exerciseData.instructions,
      exerciseData.exerciseType,
      exerciseData.orderIndex,
      exerciseData.config || {},
      exerciseData.content,
      exerciseData.solution || null,
      exerciseData.rubric || null,
      exerciseData.autoGradable !== false,
      exerciseData.difficulty,
      exerciseData.maxPoints || 100,
      exerciseData.passingScore || 70,
      exerciseData.estimatedTimeMinutes || 10,
      exerciseData.timeLimitMinutes || null,
      exerciseData.maxAttempts || 3,
      exerciseData.hints || [],
      exerciseData.comodinesAllowed || ['pistas', 'vision_lectora', 'segunda_oportunidad'],
      exerciseData.xpReward || 20,
      exerciseData.mlCoinsReward || 5,
      createdBy
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update exercise
   */
  async updateExercise(
    exerciseId: string,
    updates: Partial<CreateExerciseDto>
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.content) {
      fields.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    if (updates.difficulty) {
      fields.push(`difficulty_level = $${paramIndex++}`);
      values.push(updates.difficulty);
    }

    if (fields.length === 0) return true;

    fields.push(`updated_at = NOW()`);
    values.push(exerciseId);

    const query = `
      UPDATE educational_content.exercises
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await this.pool.query(query, values);
    return true;
  }

  /**
   * Delete exercise (soft delete)
   */
  async deleteExercise(exerciseId: string): Promise<boolean> {
    const query = `
      UPDATE educational_content.exercises
      SET is_active = false
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [exerciseId]);
    return result.rowCount > 0;
  }
}
