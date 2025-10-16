/**
 * Modules Repository
 *
 * Data access layer for educational modules.
 * Handles all database operations for modules table.
 *
 * @module modules.repository
 */

import { Pool, PoolClient } from 'pg';
import {
  ModuleResponse,
  ModuleDetailResponse,
  CreateModuleDto,
  PaginationQuery,
  FilterOptions
} from './educational.types';

export class ModulesRepository {
  constructor(private pool: Pool) {}

  /**
   * Get all modules with pagination and filtering
   */
  async getAllModules(
    filters?: FilterOptions,
    pagination?: PaginationQuery
  ): Promise<{ modules: ModuleResponse[]; total: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = pagination?.sortBy || 'order_index';
    const order = pagination?.order || 'asc';

    let query = `
      SELECT
        m.id,
        m.title,
        m.subtitle,
        m.description,
        m.order_index as "orderIndex",
        m.difficulty_level as difficulty,
        m.estimated_duration_minutes as "estimatedDurationMinutes",
        m.thumbnail_url as "thumbnailUrl",
        m.rango_maya_required as "rangoMayaRequired",
        m.rango_maya_granted as "rangoMayaGranted",
        m.xp_reward as "xpReward",
        m.ml_coins_reward as "mlCoinsReward",
        m.is_published as "isPublished",
        m.learning_objectives as "learningObjectives",
        m.tags,
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        COUNT(e.id) as "totalExercises"
      FROM educational_content.modules m
      LEFT JOIN educational_content.exercises e ON m.id = e.module_id AND e.is_active = true
      WHERE m.is_published = true
    `;

    const params: any[] = [];

    if (filters?.difficulty) {
      params.push(filters.difficulty);
      query += ` AND m.difficulty_level = $${params.length}`;
    }

    query += `
      GROUP BY m.id
      ORDER BY m.${sortBy} ${order}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const [modulesResult, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query('SELECT COUNT(*) FROM educational_content.modules WHERE is_published = true')
    ]);

    return {
      modules: modulesResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Get module by ID
   */
  async getModuleById(moduleId: string): Promise<ModuleResponse | null> {
    const query = `
      SELECT
        m.id,
        m.title,
        m.subtitle,
        m.description,
        m.summary,
        m.order_index as "orderIndex",
        m.difficulty_level as difficulty,
        m.estimated_duration_minutes as "estimatedDurationMinutes",
        m.learning_objectives as "learningObjectives",
        m.competencies,
        m.skills_developed as "skillsDeveloped",
        m.prerequisites,
        m.rango_maya_required as "rangoMayaRequired",
        m.rango_maya_granted as "rangoMayaGranted",
        m.xp_reward as "xpReward",
        m.ml_coins_reward as "mlCoinsReward",
        m.is_published as "isPublished",
        m.thumbnail_url as "thumbnailUrl",
        m.cover_image_url as "coverImageUrl",
        m.tags,
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        COUNT(e.id) as "totalExercises"
      FROM educational_content.modules m
      LEFT JOIN educational_content.exercises e ON m.id = e.module_id AND e.is_active = true
      WHERE m.id = $1
      GROUP BY m.id
    `;

    const result = await this.pool.query(query, [moduleId]);
    return result.rows[0] || null;
  }

  /**
   * Get module details with exercises list
   */
  async getModuleDetails(
    moduleId: string,
    userId?: string
  ): Promise<ModuleDetailResponse | null> {
    const module = await this.getModuleById(moduleId);
    if (!module) return null;

    // Get exercises for this module
    const exercisesQuery = `
      SELECT
        e.id,
        e.title,
        e.exercise_type as "exerciseType",
        e.order_index as "orderIndex",
        e.difficulty_level as difficulty,
        e.estimated_time_minutes as "estimatedTimeMinutes",
        e.max_points as "pointsReward",
        COALESCE(
          (SELECT COUNT(*) > 0
           FROM progress_tracking.exercise_attempts ea
           WHERE ea.exercise_id = e.id
           AND ea.user_id = $2
           AND ea.is_correct = true),
          true
        ) as "isUnlocked"
      FROM educational_content.exercises e
      WHERE e.module_id = $1 AND e.is_active = true
      ORDER BY e.order_index ASC
    `;

    const exercisesResult = await this.pool.query(exercisesQuery, [
      moduleId,
      userId || null
    ]);

    // Calculate user progress if userId provided
    let completedExercises = 0;
    let progressPercentage = 0;

    if (userId) {
      const progressQuery = `
        SELECT
          completed_exercises as "completedExercises",
          progress_percentage as "progressPercentage"
        FROM progress_tracking.module_progress
        WHERE module_id = $1 AND user_id = $2
      `;
      const progressResult = await this.pool.query(progressQuery, [moduleId, userId]);
      if (progressResult.rows[0]) {
        completedExercises = progressResult.rows[0].completedExercises;
        progressPercentage = progressResult.rows[0].progressPercentage;
      }
    }

    return {
      ...module,
      exercises: exercisesResult.rows,
      completedExercises,
      progressPercentage
    };
  }

  /**
   * Create new module
   */
  async createModule(
    moduleData: CreateModuleDto,
    createdBy: string
  ): Promise<ModuleResponse> {
    const query = `
      INSERT INTO educational_content.modules (
        title,
        subtitle,
        description,
        summary,
        order_index,
        difficulty_level,
        estimated_duration_minutes,
        learning_objectives,
        rango_maya_required,
        rango_maya_granted,
        xp_reward,
        ml_coins_reward,
        thumbnail_url,
        tags,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING
        id,
        title,
        subtitle,
        description,
        order_index as "orderIndex",
        difficulty_level as difficulty,
        estimated_duration_minutes as "estimatedDurationMinutes",
        rango_maya_required as "rangoMayaRequired",
        rango_maya_granted as "rangoMayaGranted",
        xp_reward as "xpReward",
        ml_coins_reward as "mlCoinsReward",
        is_published as "isPublished",
        thumbnail_url as "thumbnailUrl",
        tags,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      moduleData.title,
      moduleData.subtitle || null,
      moduleData.description,
      moduleData.summary || null,
      moduleData.orderIndex,
      moduleData.difficulty,
      moduleData.estimatedDurationMinutes || 120,
      moduleData.learningObjectives || [],
      moduleData.rangoMayaRequired || null,
      moduleData.rangoMayaGranted || null,
      moduleData.xpReward || 100,
      moduleData.mlCoinsReward || 50,
      moduleData.thumbnailUrl || null,
      moduleData.tags || [],
      createdBy
    ];

    const result = await this.pool.query(query, values);
    return { ...result.rows[0], totalExercises: 0 };
  }

  /**
   * Update module
   */
  async updateModule(
    moduleId: string,
    updates: Partial<CreateModuleDto>
  ): Promise<ModuleResponse | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.subtitle !== undefined) {
      fields.push(`subtitle = $${paramIndex++}`);
      values.push(updates.subtitle);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.difficulty !== undefined) {
      fields.push(`difficulty_level = $${paramIndex++}`);
      values.push(updates.difficulty);
    }
    if (updates.estimatedDurationMinutes !== undefined) {
      fields.push(`estimated_duration_minutes = $${paramIndex++}`);
      values.push(updates.estimatedDurationMinutes);
    }
    if (updates.learningObjectives !== undefined) {
      fields.push(`learning_objectives = $${paramIndex++}`);
      values.push(updates.learningObjectives);
    }
    if (updates.xpReward !== undefined) {
      fields.push(`xp_reward = $${paramIndex++}`);
      values.push(updates.xpReward);
    }
    if (updates.mlCoinsReward !== undefined) {
      fields.push(`ml_coins_reward = $${paramIndex++}`);
      values.push(updates.mlCoinsReward);
    }

    if (fields.length === 0) {
      return this.getModuleById(moduleId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(moduleId);

    const query = `
      UPDATE educational_content.modules
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id
    `;

    await this.pool.query(query, values);
    return this.getModuleById(moduleId);
  }

  /**
   * Delete module (soft delete by setting archived_at)
   */
  async deleteModule(moduleId: string): Promise<boolean> {
    const query = `
      UPDATE educational_content.modules
      SET archived_at = NOW(), is_published = false
      WHERE id = $1
      RETURNING id
    `;

    const result = await this.pool.query(query, [moduleId]);
    return result.rowCount > 0;
  }

  /**
   * Publish/Unpublish module
   */
  async updatePublishStatus(
    moduleId: string,
    isPublished: boolean
  ): Promise<boolean> {
    const query = `
      UPDATE educational_content.modules
      SET
        is_published = $1,
        published_at = CASE WHEN $1 = true THEN NOW() ELSE published_at END,
        status = CASE WHEN $1 = true THEN 'published' ELSE 'draft' END
      WHERE id = $2
      RETURNING id
    `;

    const result = await this.pool.query(query, [isPublished, moduleId]);
    return result.rowCount > 0;
  }

  /**
   * Get modules by rank requirement
   */
  async getModulesByRank(rank: string): Promise<ModuleResponse[]> {
    const query = `
      SELECT
        m.id,
        m.title,
        m.description,
        m.order_index as "orderIndex",
        m.difficulty_level as difficulty,
        m.rango_maya_required as "rangoMayaRequired",
        m.xp_reward as "xpReward",
        m.ml_coins_reward as "mlCoinsReward",
        COUNT(e.id) as "totalExercises"
      FROM educational_content.modules m
      LEFT JOIN educational_content.exercises e ON m.id = e.module_id
      WHERE m.rango_maya_required = $1 AND m.is_published = true
      GROUP BY m.id
      ORDER BY m.order_index ASC
    `;

    const result = await this.pool.query(query, [rank]);
    return result.rows;
  }

  /**
   * Check if user has access to module based on rank
   */
  async checkModuleAccess(moduleId: string, userRank: string): Promise<boolean> {
    const query = `
      SELECT rango_maya_required
      FROM educational_content.modules
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [moduleId]);
    if (result.rows.length === 0) return false;

    const requiredRank = result.rows[0].rango_maya_required;
    if (!requiredRank) return true; // No rank requirement

    // Rank hierarchy: nacom < batab < holcatte < guerrero < mercenario
    const ranks = ['nacom', 'batab', 'holcatte', 'guerrero', 'mercenario'];
    const requiredIndex = ranks.indexOf(requiredRank);
    const userIndex = ranks.indexOf(userRank.toLowerCase());

    return userIndex >= requiredIndex;
  }

  /**
   * Get all modules for a specific user with progress
   */
  async getUserModules(userId: string): Promise<any[]> {
    const query = `
      SELECT
        m.id,
        m.title,
        m.description,
        m.difficulty_level as difficulty,
        CASE
          WHEN mp.completed_exercises > 0 THEN 'in_progress'
          WHEN m.is_published = false THEN 'locked'
          ELSE 'available'
        END as status,
        COALESCE((mp.completed_exercises::float / NULLIF(exercise_count.total, 0) * 100), 0) as progress,
        COALESCE(exercise_count.total, 0) as "totalExercises",
        COALESCE(mp.completed_exercises, 0) as "completedExercises",
        m.estimated_duration_minutes as "estimatedTime",
        m.xp_reward as "xpReward",
        m.thumbnail_url as icon,
        'science' as category,
        m.ml_coins_reward as "mlCoinsReward"
      FROM educational_content.modules m
      LEFT JOIN (
        SELECT
          module_id,
          completed_exercises,
          progress_percentage
        FROM progress_tracking.module_progress
        WHERE user_id = $1
      ) mp ON m.id = mp.module_id
      LEFT JOIN (
        SELECT
          module_id,
          COUNT(*) as total
        FROM educational_content.exercises
        WHERE is_active = true
        GROUP BY module_id
      ) exercise_count ON m.id = exercise_count.module_id
      WHERE m.is_published = true
      ORDER BY m.order_index;
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}
