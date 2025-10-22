/**
 * Exercises Service
 *
 * Business logic for exercise management.
 */

import { Pool } from 'pg';
import { ExercisesRepository } from './exercises.repository';
import { ExerciseResponse, CreateExerciseDto, PaginationQuery, FilterOptions, SubmitExerciseDto, SubmissionResponse, ExerciseContent, ComodinType } from './educational.types';
import { ScoringService } from './scoring.service';
import { ExerciseContentValidator } from './validators';
import { SubmitExercisePayload } from './dto/submit-exercise.dto';
import { sanitizeExercise, sanitizeExercises } from './utils/sanitize-exercise';
import { RanksService } from '../gamification/ranks.service';
import { RanksRepository } from '../gamification/ranks.repository';

export class ExercisesService {
  private repository: ExercisesRepository;
  private scoringService: ScoringService;
  private contentValidator: ExerciseContentValidator;

  constructor(pool: Pool) {
    this.repository = new ExercisesRepository(pool);
    const ranksRepository = new RanksRepository(pool);
    const ranksService = new RanksService(ranksRepository);
    this.scoringService = new ScoringService(pool, ranksService);
    this.contentValidator = new ExerciseContentValidator();
  }

  /**
   * Get all exercises
   *
   * SECURITY: Sanitizes exercises to remove correct answers
   */
  async getAllExercises(filters?: FilterOptions, pagination?: PaginationQuery) {
    const result = await this.repository.getAllExercises(filters, pagination);
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const totalPages = Math.ceil(result.total / limit);

    // SECURITY: Remove correct answers from all exercises
    const sanitizedExercises = sanitizeExercises(result.exercises);

    return {
      exercises: sanitizedExercises,
      total: result.total,
      page,
      totalPages
    };
  }

  /**
   * Get exercise by ID
   *
   * SECURITY: Sanitizes exercise to remove correct answers.
   * Correct answers are ONLY sent after submission via submitExerciseSecure.
   */
  async getExerciseById(exerciseId: string, userId?: string): Promise<ExerciseResponse> {
    const exercise = await this.repository.getExerciseById(exerciseId, userId);

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // SECURITY: Remove correct answers before sending to frontend
    const sanitizedExercise = sanitizeExercise(exercise);

    return sanitizedExercise;
  }

  /**
   * Get hints for an exercise
   * Returns the hints array from the exercise
   */
  async getExerciseHints(exerciseId: string, userId?: string): Promise<Array<{ id: string; text: string; cost: number; order: number }>> {
    const exercise = await this.repository.getExerciseById(exerciseId, userId);

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Return hints if they exist, otherwise return empty array
    const hints = exercise.hints || [];

    // Transform hints to match expected format
    return hints.map((hint, index) => ({
      id: String(index + 1),
      text: hint,
      cost: 10 * (index + 1), // Progressive cost: 10, 20, 30...
      order: index + 1
    }));
  }

  /**
   * Create new exercise
   */
  async createExercise(exerciseData: CreateExerciseDto, createdBy: string): Promise<ExerciseResponse> {
    // Basic validation
    this.validateExerciseData(exerciseData);

    // Content-specific validation
    const validationResult = this.contentValidator.validate(
      exerciseData.exerciseType,
      exerciseData.content
    );

    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors
        .map(err => `[${err.severity}] ${err.field}: ${err.message}`)
        .join('; ');

      throw new Error(`Invalid exercise content: ${errorMessages}`);
    }

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

    // Validate content if it's being updated
    if (updates.content && updates.exerciseType) {
      const validationResult = this.contentValidator.validate(
        updates.exerciseType,
        updates.content
      );

      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors
          .map(err => `[${err.severity}] ${err.field}: ${err.message}`)
          .join('; ');

        throw new Error(`Invalid exercise content: ${errorMessages}`);
      }
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
   * Submit exercise attempt (LEGACY - kept for backward compatibility)
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

  /**
   * SECURE Submit Exercise
   *
   * Server-side validation with correct answers hidden until after submission.
   * This is the secure version that should be used by all new implementations.
   *
   * @param submission - Validated submission payload
   * @returns Submission result with correct answers and explanations
   */
  async submitExerciseSecure(submission: SubmitExercisePayload): Promise<SubmissionResponse & {
    correctAnswers: any;
    explanations: any;
  }> {
    // 1. Get full exercise data (including correct answers) from database
    const exercise = await this.repository.getExerciseById(
      submission.exerciseId,
      submission.userId
    );

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // 2. Validate answers server-side (NEVER trust frontend)
    const validationResult = this.validateAnswers(
      exercise.content,
      submission.answers,
      exercise.exerciseType
    );

    // 3. Calculate score using scoring service
    const legacySubmission: SubmitExerciseDto = {
      userId: submission.userId,
      exerciseId: submission.exerciseId,
      answers: submission.answers,
      timeSpent: submission.timeSpent,
      powerupsUsed: submission.powerupsUsed as any[] as ComodinType[]
    };

    const scoreResult = await this.scoringService.calculateScore(
      legacySubmission,
      exercise
    );

    // 4. Extract correct answers from exercise content (ONLY sent after submission)
    const correctAnswers = this.extractCorrectAnswers(exercise.content, exercise.exerciseType);
    const explanations = exercise.content.explanations || {};

    // 5. Return complete result with correct answers
    return {
      ...scoreResult,
      correctAnswers,
      explanations
    };
  }

  /**
   * Validate user answers against correct answers
   *
   * @param content - Exercise content (with correct answers)
   * @param userAnswers - User's submitted answers
   * @param exerciseType - Type of exercise
   * @returns Validation result with correct/incorrect count
   */
  private validateAnswers(
    content: ExerciseContent,
    userAnswers: any,
    exerciseType: string
  ): { correctCount: number; totalQuestions: number; isValid: boolean } {
    let correctCount = 0;
    let totalQuestions = 0;

    // Type-specific validation logic
    switch (exerciseType) {
      case 'verdadero_falso':
        // Validate true/false statements
        if (content.statements && Array.isArray(content.statements)) {
          totalQuestions = content.statements.length;
          content.statements.forEach((statement: any) => {
            if (userAnswers[statement.id] === statement.correctAnswer) {
              correctCount++;
            }
          });
        }
        break;

      case 'crucigrama_cientifico':
        // Validate crossword clues
        const clues = content.clues as any;
        if (clues) {
          // Across clues
          clues.across?.forEach((clue: any) => {
            totalQuestions++;
            if (userAnswers[`across_${clue.number}`]?.toLowerCase() === clue.answer.toLowerCase()) {
              correctCount++;
            }
          });

          // Down clues
          clues.down?.forEach((clue: any) => {
            totalQuestions++;
            if (userAnswers[`down_${clue.number}`]?.toLowerCase() === clue.answer.toLowerCase()) {
              correctCount++;
            }
          });
        }
        break;

      case 'multiple_choice':
        // Validate multiple choice questions
        if (content.questions && Array.isArray(content.questions)) {
          totalQuestions = content.questions.length;
          content.questions.forEach((question: any) => {
            if (userAnswers[question.id] === question.correctAnswer) {
              correctCount++;
            }
          });
        }
        break;

      default:
        // Generic validation for other types
        if (content.correctAnswers) {
          totalQuestions = Object.keys(content.correctAnswers).length;
          Object.entries(content.correctAnswers).forEach(([key, correctValue]) => {
            if (userAnswers[key] === correctValue) {
              correctCount++;
            }
          });
        }
    }

    return {
      correctCount,
      totalQuestions,
      isValid: totalQuestions > 0
    };
  }

  /**
   * Extract correct answers from exercise content
   *
   * @param content - Exercise content
   * @param exerciseType - Type of exercise
   * @returns Object with correct answers
   */
  private extractCorrectAnswers(content: ExerciseContent, exerciseType: string): any {
    switch (exerciseType) {
      case 'verdadero_falso':
        if (content.statements && Array.isArray(content.statements)) {
          return content.statements.reduce((acc: any, statement: any) => {
            acc[statement.id] = statement.correctAnswer;
            return acc;
          }, {});
        }
        break;

      case 'crucigrama_cientifico':
        const clues = content.clues as any;
        const answers: any = {};
        if (clues) {
          clues.across?.forEach((clue: any) => {
            answers[`across_${clue.number}`] = clue.answer;
          });
          clues.down?.forEach((clue: any) => {
            answers[`down_${clue.number}`] = clue.answer;
          });
        }
        return answers;

      case 'multiple_choice':
        if (content.questions && Array.isArray(content.questions)) {
          return content.questions.reduce((acc: any, question: any) => {
            acc[question.id] = question.correctAnswer;
            return acc;
          }, {});
        }
        break;

      default:
        return content.correctAnswers || {};
    }

    return {};
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
