/**
 * Exercises Service
 *
 * Business logic for exercise management.
 */

import { Pool } from 'pg';
import { ExercisesRepository } from './exercises.repository';
import { ExerciseResponse, CreateExerciseDto, PaginationQuery, FilterOptions, SubmitExerciseDto, SubmissionResponse } from './educational.types';
import { ScoringService } from './scoring.service';

export class ExercisesService {
  private repository: ExercisesRepository;
  private scoringService: ScoringService;

  constructor(pool: Pool) {
    this.repository = new ExercisesRepository(pool);
    this.scoringService = new ScoringService(pool);
  }

  /**
   * Get all exercises
   */
  async getAllExercises(filters?: FilterOptions, pagination?: PaginationQuery) {
    const result = await this.repository.getAllExercises(filters, pagination);
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const totalPages = Math.ceil(result.total / limit);

    return {
      exercises: result.exercises,
      total: result.total,
      page,
      totalPages
    };
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(exerciseId: string, userId?: string): Promise<ExerciseResponse> {
    const exercise = await this.repository.getExerciseById(exerciseId, userId);

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    return exercise;
  }

  /**
   * Create new exercise
   */
  async createExercise(exerciseData: CreateExerciseDto, createdBy: string): Promise<ExerciseResponse> {
    this.validateExerciseData(exerciseData);
    return this.repository.createExercise(exerciseData, createdBy);
  }

  /**
   * Update exercise
   */
  async updateExercise(exerciseId: string, updates: Partial<CreateExerciseDto>): Promise<void> {
    const exercise = await this.repository.getExerciseById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    await this.repository.updateExercise(exerciseId, updates);
  }

  /**
   * Delete exercise
   */
  async deleteExercise(exerciseId: string): Promise<void> {
    const exercise = await this.repository.getExerciseById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    await this.repository.deleteExercise(exerciseId);
  }

  /**
   * Submit exercise attempt
   */
  async submitExercise(submission: SubmitExerciseDto): Promise<SubmissionResponse> {
    const exercise = await this.repository.getExerciseById(submission.exerciseId, submission.userId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Calculate score
    const scoreResult = await this.scoringService.calculateScore(
      submission,
      exercise
    );

    // Save attempt and return response
    return scoreResult;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private validateExerciseData(data: CreateExerciseDto): void {
    if (!data.title || data.title.trim().length < 3) {
      throw new Error('Exercise title must be at least 3 characters');
    }

    if (!data.description || data.description.trim().length < 10) {
      throw new Error('Exercise description must be at least 10 characters');
    }

    if (!data.moduleId) {
      throw new Error('Module ID is required');
    }

    if (!data.exerciseType) {
      throw new Error('Exercise type is required');
    }

    if (!data.content) {
      throw new Error('Exercise content is required');
    }
  }
}
