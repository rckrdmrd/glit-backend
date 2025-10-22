/**
 * Exercises Controller
 * HTTP request handlers for exercises endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto, SubmitExerciseDto, PaginationQuery, FilterOptions } from './educational.types';
import { validateSubmission, SubmitExercisePayload } from './dto/submit-exercise.dto';
import { getRateLimiter, TooManyRequestsError } from '../../shared/services/rate-limiter.service';
import { log } from '../../shared/utils/logger';

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
   * GET /api/educational/mechanics/:exerciseId/hints
   * Returns hints for an exercise
   */
  getExerciseHints = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { exerciseId } = req.params;
      const userId = req.user?.id;

      const hints = await this.exercisesService.getExerciseHints(exerciseId, userId);

      res.json({
        success: true,
        data: hints
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
   *
   * SECURE ENDPOINT with:
   * - Rate limiting (max 1 submit per 5 seconds)
   * - Zod validation
   * - Timestamp anti-cheat
   * - Server-side answer validation
   */
  submitExercise = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { exerciseId } = req.params;
      const userId = req.user?.id!;

      // 1. RATE LIMITING: Prevent rapid-fire submissions
      const rateLimiter = getRateLimiter();
      try {
        await rateLimiter.checkLimit(userId, exerciseId);
      } catch (error) {
        if (error instanceof TooManyRequestsError) {
          return res.status(429).json({
            success: false,
            error: {
              message: error.message,
              retryAfter: error.retryAfter,
              code: 'RATE_LIMIT_EXCEEDED'
            }
          });
        }
        throw error;
      }

      // 2. VALIDATION: Validate request payload
      let validatedData;
      try {
        // Log incoming payload for debugging
        log.debug('[submitExercise] Received payload: ' + JSON.stringify(req.body));

        validatedData = validateSubmission(req.body);

        log.debug('[submitExercise] Validated data: ' + JSON.stringify(validatedData));
      } catch (error: any) {
        log.error('[submitExercise] Validation error: ' + error.message);
        log.error('[submitExercise] Validation details: ' + JSON.stringify(error.errors));

        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid submission data',
            details: error.errors || error.message,
            code: 'VALIDATION_ERROR'
          }
        });
      }

      // 3. ANTI-CHEAT: Validate timestamp
      const now = Date.now();
      const timeTaken = now - validatedData.startedAt;

      // Minimum 1 second (prevent instant submissions)
      if (timeTaken < 1000) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Submission too fast. Please take time to complete the exercise.',
            code: 'SUBMISSION_TOO_FAST'
          }
        });
      }

      // Maximum 24 hours (prevent stale sessions)
      if (timeTaken > 86400000) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Session expired. Please start the exercise again.',
            code: 'SESSION_EXPIRED'
          }
        });
      }

      // 4. BUILD SECURE SUBMISSION
      const submission: SubmitExercisePayload = {
        userId,
        exerciseId,
        answers: validatedData.answers,
        startedAt: validatedData.startedAt,
        timeSpent: Math.floor(timeTaken / 1000), // Convert to seconds
        hintsUsed: validatedData.hintsUsed,
        powerupsUsed: validatedData.powerupsUsed,
        sessionId: validatedData.sessionId
      };

      // 5. SUBMIT TO SERVICE (validation happens server-side)
      const result = await this.exercisesService.submitExerciseSecure(submission);

      // 6. RETURN RESULT (includes correct answers ONLY after submission)
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
