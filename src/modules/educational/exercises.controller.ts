/**
 * Exercises Controller
 * HTTP request handlers for exercises endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto, SubmitExerciseDto, PaginationQuery, FilterOptions } from './educational.types';

export class ExercisesController {
  constructor(private exercisesService: ExercisesService) {}

  /**
   * GET /api/educational/exercises
   */
  getAllExercises = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const pagination: PaginationQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const filters: FilterOptions = {
        moduleId: req.query.moduleId as string,
        type: req.query.type as any,
        difficulty: req.query.difficulty as any
      };

      const result = await this.exercisesService.getAllExercises(filters, pagination);

      res.json({
        success: true,
        data: result.exercises,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/educational/exercises/:exerciseId
   */
  getExerciseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { exerciseId } = req.params;
      const userId = req.user?.id;

      const exercise = await this.exercisesService.getExerciseById(exerciseId, userId);

      res.json({
        success: true,
        data: exercise
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/educational/exercises
   */
  createExercise = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const exerciseData: CreateExerciseDto = req.body;
      const createdBy = req.user?.id!;

      const exercise = await this.exercisesService.createExercise(exerciseData, createdBy);

      res.status(201).json({
        success: true,
        data: exercise
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/educational/exercises/:exerciseId/submit
   */
  submitExercise = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { exerciseId } = req.params;
      const userId = req.user?.id!;

      const submission: SubmitExerciseDto = {
        userId,
        exerciseId,
        answers: req.body.answers,
        timeSpent: req.body.timeSpent,
        powerupsUsed: req.body.powerupsUsed || []
      };

      const result = await this.exercisesService.submitExercise(submission);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/educational/exercises/:exerciseId
   */
  updateExercise = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { exerciseId } = req.params;
      const updates: Partial<CreateExerciseDto> = req.body;

      await this.exercisesService.updateExercise(exerciseId, updates);

      res.json({
        success: true,
        data: { message: 'Exercise updated successfully' }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/educational/exercises/:exerciseId
   */
  deleteExercise = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { exerciseId } = req.params;

      await this.exercisesService.deleteExercise(exerciseId);

      res.json({
        success: true,
        data: { message: 'Exercise deleted successfully' }
      });
    } catch (error) {
      next(error);
    }
  };
}
