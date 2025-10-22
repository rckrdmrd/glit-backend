/**
 * Scoring Service
 *
 * Unified scoring system for all 27 exercise types.
 * Handles automatic and manual scoring with multipliers and bonuses.
 */

import { Pool } from 'pg';
import {
  SubmitExerciseDto,
  SubmissionResponse,
  ExerciseResponse,
  ExerciseType,
  ScoreResult,
  ComodinType
} from './educational.types';
import { RanksService } from '../gamification/ranks.service';
import { StreaksService } from '../gamification/streaks.service';
import { AchievementsService } from '../gamification/achievements.service';
import { ProgressService } from './progress.service';
import { log } from '../../shared/utils/logger';
import {
  notifyAchievementUnlocked,
  notifyRankUp
} from '../notifications/notifications.helper';
import {
  notifyExerciseCompleted,
  notifyMLCoinsEarned,
  notifyXPEarned
} from '../gamification/missions/missions.events';

export class ScoringService {
  private streaksService: StreaksService;
  private achievementsService: AchievementsService;
  private progressService: ProgressService;

  constructor(
    private pool: Pool,
    private ranksService: RanksService
  ) {
    this.streaksService = new StreaksService(pool);
    this.achievementsService = new AchievementsService(pool);
    this.progressService = new ProgressService(this.pool);
  }

  /**
   * Calculate score for exercise attempt
   */
  async calculateScore(
    submission: SubmitExerciseDto,
    exercise: ExerciseResponse
  ): Promise<SubmissionResponse> {
    // Get user stats for multipliers
    const userStats = await this.getUserStats(submission.userId);

    // Calculate base score based on exercise type
    const baseScore = this.calculateBaseScore(submission.answers, exercise);

    // Apply multipliers and bonuses
    const scoreResult = this.applyMultipliersAndBonuses(
      baseScore,
      exercise,
      submission,
      userStats
    );

    // Save attempt to database
    const attemptId = await this.saveAttempt(
      submission,
      exercise,
      scoreResult
    );

    // NOTE: Rewards are automatically awarded by database trigger
    // trg_update_user_stats_on_exercise when inserting into exercise_attempts
    // No need to call awardRewards() here to avoid duplication

    // Update streak after activity
    try {
      await this.streaksService.onUserActivity(submission.userId);
      log.info(`Streak updated for user ${submission.userId} after exercise completion`);
    } catch (error) {
      // Don't fail the entire request if streak update fails
      log.error('Error updating streak:', error);
    }

    // Check for achievements after exercise completion
    const achievements = await this.checkAchievements(submission.userId, submission.exerciseId, scoreResult, submission.timeSpent, submission.powerupsUsed?.length || 0);

    // Send notifications for unlocked achievements
    if (achievements && achievements.length > 0) {
      for (const achievement of achievements) {
        try {
          await notifyAchievementUnlocked(
            submission.userId,
            achievement.id,
            achievement.name,
            achievement.iconUrl || '🏆',
            achievement.rewards?.mlCoins || 0
          );
        } catch (error) {
          log.error('Error sending achievement notification:', error);
        }
      }
    }

    // Auto-check for rank promotion after awarding XP
    let rankUp = null;
    try {
      const promotionResult = await this.ranksService.autoCheckPromotion(submission.userId);

      if (promotionResult.promoted) {
        log.info(
          `User ${submission.userId} promoted from ${promotionResult.previousRank || 'unknown'} to ${promotionResult.newRank}!`
        );

        rankUp = {
          newRank: promotionResult.newRank,
          previousRank: promotionResult.previousRank,
          bonusMLCoins: promotionResult.rewards?.mlCoins || 0,
          newMultiplier: promotionResult.rewards?.multiplier || 1.0
        };

        // Send rank up notification
        try {
          await notifyRankUp(
            submission.userId,
            promotionResult.newRank!,
            promotionResult.previousRank || 'nacom',
            promotionResult.rewards?.mlCoins || 0
          );
        } catch (error) {
          log.error('Error sending rank up notification:', error);
        }
      }
    } catch (error) {
      // Don't fail the entire request if promotion check fails
      log.error('Error checking rank promotion:', error);
    }

    // Update module progress after successful exercise completion
    if (scoreResult.finalScore >= (exercise.passingScore || 70)) {
      try {
        await this.progressService.updateModuleProgress(submission.userId, exercise.moduleId, true);
        log.info(`Module progress updated for user ${submission.userId}, module ${exercise.moduleId}`);
      } catch (error) {
        // Don't fail the entire request if progress update fails
        log.error('Error updating module progress:', error);
      }
    }

    // Notify missions system about exercise completion
    if (scoreResult.finalScore >= (exercise.passingScore || 70)) {
      try {
        // Exercise completion event
        await notifyExerciseCompleted(submission.userId, {
          exerciseId: submission.exerciseId,
          exerciseType: exercise.exerciseType,
          score: scoreResult.finalScore,
          isPerfect: scoreResult.finalScore === 100,
          difficulty: exercise.difficulty,
          moduleId: exercise.moduleId,
        });

        // ML Coins earned event
        if (scoreResult.mlCoins > 0) {
          await notifyMLCoinsEarned(submission.userId, {
            amount: scoreResult.mlCoins,
            source: 'exercise_completion',
            exerciseId: submission.exerciseId,
          });
        }

        // XP earned event
        if (scoreResult.xp > 0) {
          await notifyXPEarned(submission.userId, {
            amount: scoreResult.xp,
            source: 'exercise_completion',
            exerciseId: submission.exerciseId,
          });
        }

        log.info(`Mission events triggered for user ${submission.userId}`);
      } catch (error) {
        // Don't fail the request if mission update fails
        log.error('Error notifying mission system:', error);
      }
    }

    // Generate feedback
    const feedback = this.generateFeedback(submission.answers, exercise, scoreResult);

    return {
      attemptId,
      score: scoreResult.finalScore,
      isPerfect: scoreResult.finalScore === 100,
      correctAnswers: feedback.answerReview.filter(a => a.isCorrect).length,
      totalQuestions: feedback.answerReview.length,
      rewards: {
        mlCoins: scoreResult.mlCoins,
        xp: scoreResult.xp,
        bonuses: scoreResult.bonuses
      },
      feedback,
      achievements,
      rankUp,
      createdAt: new Date()
    };
  }

  /**
   * Calculate base score based on exercise type
   */
  private calculateBaseScore(answers: any, exercise: ExerciseResponse): number {
    const exerciseType = exercise.exerciseType;

    switch (exerciseType) {
      // ========== AUTOMATIC SCORING (13 types) ==========

      case ExerciseType.CRUCIGRAMA:
        return this.scoreCrucigrama(answers, exercise);

      case ExerciseType.SOPA_LETRAS:
        return this.scoreSopaLetras(answers, exercise);

      case ExerciseType.EMPAREJAMIENTO:
        return this.scoreEmparejamiento(answers, exercise);

      case ExerciseType.LINEA_TIEMPO:
        return this.scoreLineaTiempo(answers, exercise);

      case ExerciseType.QUIZ_TIKTOK:
        return this.scoreQuizTikTok(answers, exercise);

      case ExerciseType.COMPRENSION_AUDITIVA:
        return this.scoreComprensionAuditiva(answers, exercise);

      case ExerciseType.VERDADERO_FALSO:
        return this.scoreVerdaderoFalso(answers, exercise);

      case ExerciseType.COMPLETAR_ESPACIOS:
        return this.scoreCompletarEspacios(answers, exercise);

      case ExerciseType.NAVEGACION_HIPERTEXTUAL:
        return this.scoreNavegacionHipertextual(answers, exercise);

      case ExerciseType.ANALISIS_MEMES:
        return this.scoreAnalisisMemes(answers, exercise);

      case ExerciseType.VERIFICADOR_FAKE_NEWS:
        return this.scoreVerificadorFakeNews(answers, exercise);

      case ExerciseType.CALL_TO_ACTION:
        return this.scoreCallToAction(answers, exercise);

      case ExerciseType.TEXTO_MOVIMIENTO:
        return this.scoreTextoMovimiento(answers, exercise);

      case ExerciseType.MAPA_CONCEPTUAL:
        return this.scoreMapaConceptual(answers, exercise);

      case ExerciseType.COLLAGE_PRENSA:
        return this.scoreCollagePrensaAuto(answers, exercise);

      // ========== MANUAL SCORING (14 types) ==========
      // These return 0 and require teacher review

      case ExerciseType.DETECTIVE_TEXTUAL:
      case ExerciseType.CONSTRUCCION_HIPOTESIS:
      case ExerciseType.PREDICCION_NARRATIVA:
      case ExerciseType.PUZZLE_CONTEXTO:
      case ExerciseType.RUEDA_INFERENCIAS:
      case ExerciseType.TRIBUNAL_OPINIONES:
      case ExerciseType.DEBATE_DIGITAL:
      case ExerciseType.ANALISIS_FUENTES:
      case ExerciseType.PODCAST_ARGUMENTATIVO:
      case ExerciseType.MATRIZ_PERSPECTIVAS:
      case ExerciseType.INFOGRAFIA_INTERACTIVA:
      case ExerciseType.DIARIO_MULTIMEDIA:
      case ExerciseType.COMIC_DIGITAL:
      case ExerciseType.VIDEO_CARTA:
        return 0; // Manual scoring - saved for teacher review

      default:
        return 0;
    }
  }

  // ============================================================================
  // TYPE-SPECIFIC SCORING METHODS
  // ============================================================================

  /**
   * Score Crucigrama (Crossword)
   */
  private scoreCrucigrama(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const totalClues = (content.clues.across?.length || 0) + (content.clues.down?.length || 0);
    let correctAnswers = 0;

    // Check across clues
    content.clues.across?.forEach((clue: any) => {
      if (answers[`across_${clue.number}`]?.toLowerCase() === clue.answer.toLowerCase()) {
        correctAnswers++;
      }
    });

    // Check down clues
    content.clues.down?.forEach((clue: any) => {
      if (answers[`down_${clue.number}`]?.toLowerCase() === clue.answer.toLowerCase()) {
        correctAnswers++;
      }
    });

    return (correctAnswers / totalClues) * 100;
  }

  /**
   * Score Sopa de Letras (Word Search)
   */
  private scoreSopaLetras(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const totalWords = content.words?.length || 0;
    const foundWords = answers.foundWords || [];

    return (foundWords.length / totalWords) * 100;
  }

  /**
   * Score Emparejamiento (Matching)
   */
  private scoreEmparejamiento(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const correctPairs = content.correctPairs || {};
    let correctMatches = 0;
    let totalPairs = Object.keys(correctPairs).length;

    Object.entries(answers.matches || {}).forEach(([key, value]) => {
      if (correctPairs[key] === value) {
        correctMatches++;
      }
    });

    return (correctMatches / totalPairs) * 100;
  }

  /**
   * Score Línea de Tiempo (Timeline)
   */
  private scoreLineaTiempo(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const events = content.events || [];

    // Sort events by year to get correct order
    const correctOrder = [...events]
      .sort((a, b) => a.year - b.year)
      .map(event => event.id);

    // Get user's answer order
    const userOrder = answers.order || [];

    // Count how many events are in correct position
    let correctPositions = 0;
    for (let i = 0; i < correctOrder.length; i++) {
      if (userOrder[i] === correctOrder[i]) {
        correctPositions++;
      }
    }

    return (correctPositions / events.length) * 100;
  }

  /**
   * Score Verdadero/Falso
   */
  private scoreVerdaderoFalso(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const statements = content.statements || [];
    let correctAnswers = 0;

    statements.forEach((statement: any, index: number) => {
      const userAnswer = answers.responses?.[index] || answers[index];
      if (userAnswer === statement.correctAnswer || userAnswer === statement.isTrue) {
        correctAnswers++;
      }
    });

    return (correctAnswers / statements.length) * 100;
  }

  /**
   * Score Completar Espacios (Fill in the blanks)
   */
  private scoreCompletarEspacios(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const blanks = content.blanks || [];
    let correctAnswers = 0;

    blanks.forEach((blank: any, index: number) => {
      const userAnswer = (answers.responses?.[index] || answers[index] || '').toString().trim().toLowerCase();
      const correctAnswer = blank.correctAnswer.toString().trim().toLowerCase();

      // Check if user answer matches correct answer (case-insensitive)
      if (userAnswer === correctAnswer) {
        correctAnswers++;
      } else if (blank.acceptedAnswers && Array.isArray(blank.acceptedAnswers)) {
        // Check alternative accepted answers
        const isAccepted = blank.acceptedAnswers.some((accepted: string) =>
          accepted.toString().trim().toLowerCase() === userAnswer
        );
        if (isAccepted) {
          correctAnswers++;
        }
      }
    });

    return (correctAnswers / blanks.length) * 100;
  }

  /**
   * Score Quiz TikTok
   */
  private scoreQuizTikTok(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const questions = content.questions || [];
    let correctAnswers = 0;

    questions.forEach((question: any, index: number) => {
      if (answers.responses?.[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    return (correctAnswers / questions.length) * 100;
  }

  /**
   * Score Comprensión Auditiva (Listening Comprehension)
   */
  private scoreComprensionAuditiva(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const questions = content.questions || [];
    let correctAnswers = 0;

    questions.forEach((question: any) => {
      if (answers[question.id] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    return (correctAnswers / questions.length) * 100;
  }

  /**
   * Score other automatic types (simplified)
   */
  private scoreNavegacionHipertextual(answers: any, exercise: ExerciseResponse): number {
    return this.scoreMultipleChoice(answers, exercise);
  }

  private scoreAnalisisMemes(answers: any, exercise: ExerciseResponse): number {
    return this.scoreMultipleChoice(answers, exercise);
  }

  private scoreVerificadorFakeNews(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const claims = content.claims || [];
    let correctIdentifications = 0;

    claims.forEach((claim: any) => {
      if (answers[claim.id] === claim.veracity) {
        correctIdentifications++;
      }
    });

    return (correctIdentifications / claims.length) * 100;
  }

  private scoreCallToAction(answers: any, exercise: ExerciseResponse): number {
    return this.scoreMultipleChoice(answers, exercise);
  }

  private scoreTextoMovimiento(answers: any, exercise: ExerciseResponse): number {
    return this.scoreMultipleChoice(answers, exercise);
  }

  private scoreMapaConceptual(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const correctRelationships = content.relationships || [];
    let correctConnections = 0;

    correctRelationships.forEach((rel: any) => {
      const userRel = answers.relationships?.find((r: any) =>
        r.fromConceptId === rel.fromConceptId && r.toConceptId === rel.toConceptId
      );
      if (userRel && userRel.label === rel.label) {
        correctConnections++;
      }
    });

    return (correctConnections / correctRelationships.length) * 100;
  }

  private scoreCollagePrensaAuto(answers: any, exercise: ExerciseResponse): number {
    // Auto-scoring based on completion criteria
    return answers.completed ? 80 : 0; // Base score for completion
  }

  /**
   * Generic multiple choice scoring
   */
  private scoreMultipleChoice(answers: any, exercise: ExerciseResponse): number {
    const content = exercise.content as any;
    const questions = content.questions || [];
    let correctAnswers = 0;

    questions.forEach((question: any) => {
      if (answers[question.id] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    return questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;
  }

  // ============================================================================
  // MULTIPLIERS AND BONUSES
  // ============================================================================

  /**
   * Apply difficulty, rank, streak multipliers and bonuses
   */
  private applyMultipliersAndBonuses(
    baseScore: number,
    exercise: ExerciseResponse,
    submission: SubmitExerciseDto,
    userStats: any
  ): ScoreResult {
    const multipliers = {
      difficulty: this.getDifficultyMultiplier(exercise.difficultyLevel),
      rank: this.getRankMultiplier(userStats.currentRank),
      streak: this.getStreakMultiplier(userStats.streakDays)
    };

    const bonuses: Record<string, number> = {};

    // Perfect score bonus
    if (baseScore === 100) {
      bonuses.perfect = 10;
    }

    // No hints bonus
    if (submission.powerupsUsed.length === 0) {
      bonuses.noHints = 5;
    }

    // Speed bonus (if completed in < 75% of estimated time)
    const estimatedTime = exercise.estimatedTimeMinutes * 60;
    if (submission.timeSpent < estimatedTime * 0.75) {
      bonuses.speed = 5;
    }

    // First attempt bonus
    const isFirstAttempt = !(exercise.userProgress && exercise.userProgress.attempts > 0);
    if (isFirstAttempt && baseScore >= 80) {
      bonuses.firstAttempt = 10;
    }

    // Calculate penalties
    const penalties: Record<string, number> = {};
    if (submission.powerupsUsed.length > 0) {
      penalties.powerups = submission.powerupsUsed.length * 5; // -5% per powerup
    }

    // Calculate final score
    let finalScore = baseScore;
    finalScore *= multipliers.difficulty;
    finalScore *= multipliers.rank;

    const bonusTotal: number = Object.values(bonuses).reduce((sum: number, val) => sum + (Number(val) || 0), 0);
    const penaltyTotal: number = Object.values(penalties).reduce((sum: number, val) => sum + (Number(val) || 0), 0);

    finalScore += bonusTotal;
    finalScore -= penaltyTotal;
    finalScore = Math.max(0, Math.min(100, finalScore)); // Clamp between 0-100

    // Calculate rewards
    const mlCoins = Math.floor((finalScore / 100) * (exercise.mlCoinsReward || 5));
    const xp = Math.floor((finalScore / 100) * (exercise.xpReward || 20));

    return {
      rawScore: baseScore,
      finalScore: Math.round(finalScore),
      multipliers,
      bonuses,
      penalties,
      mlCoins,
      xp
    };
  }

  /**
   * Get difficulty multiplier
   */
  private getDifficultyMultiplier(difficulty: string): number {
    switch (difficulty) {
      case 'beginner': return 1.0;
      case 'intermediate': return 1.25;
      case 'advanced': return 1.5;
      default: return 1.0;
    }
  }

  /**
   * Get rank multiplier
   */
  private getRankMultiplier(rank: string): number {
    switch (rank?.toLowerCase()) {
      case 'nacom': return 1.0;
      case 'batab': return 1.1;
      case 'holcatte': return 1.25;
      case 'guerrero': return 1.5;
      case 'mercenario': return 2.0;
      default: return 1.0;
    }
  }

  /**
   * Get streak multiplier
   */
  private getStreakMultiplier(streakDays: number): number {
    const bonusPercent = Math.min(streakDays * 0.05, 0.5); // 5% per day, max 50%
    return 1 + bonusPercent;
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Get user stats for multipliers
   */
  private async getUserStats(userId: string): Promise<any> {
    // First, get profile_id from auth user_id
    // userId comes from JWT (auth.users.id) but gamification tables use profile_id
    const profileQuery = `
      SELECT p.id as profile_id
      FROM auth_management.profiles p
      WHERE p.user_id = $1
    `;
    const profileResult = await this.pool.query(profileQuery, [userId]);

    if (!profileResult.rows[0]) {
      // If profile doesn't exist, return default values
      return { currentRank: 'nacom', streakDays: 0, totalXP: 0 };
    }

    const profileId = profileResult.rows[0].profile_id;

    const query = `
      SELECT
        ur.current_rank as "currentRank",
        us.current_streak as "streakDays",
        us.total_xp as "totalXP"
      FROM gamification_system.user_stats us
      LEFT JOIN gamification_system.user_ranks ur ON us.user_id = ur.user_id AND ur.is_current = true
      WHERE us.user_id = $1
    `;

    const result = await this.pool.query(query, [profileId]);
    return result.rows[0] || { currentRank: 'nacom', streakDays: 0, totalXP: 0 };
  }

  /**
   * Save attempt to database
   */
  private async saveAttempt(
    submission: SubmitExerciseDto,
    exercise: ExerciseResponse,
    scoreResult: ScoreResult
  ): Promise<string> {
    // Get profile_id from user_id (auth.users.id -> auth_management.profiles.id)
    const profileQuery = `
      SELECT p.id as profile_id
      FROM auth_management.profiles p
      WHERE p.user_id = $1
    `;
    const profileResult = await this.pool.query(profileQuery, [submission.userId]);

    if (!profileResult.rows[0]) {
      throw new Error(`Profile not found for user ${submission.userId}`);
    }

    const profileId = profileResult.rows[0].profile_id;

    const query = `
      INSERT INTO progress_tracking.exercise_attempts (
        user_id, exercise_id, submitted_answers, score,
        is_correct, time_spent_seconds, comodines_used,
        xp_earned, ml_coins_earned
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      profileId,  // Use profile_id instead of auth user_id
      submission.exerciseId,
      submission.answers,
      scoreResult.finalScore,
      scoreResult.finalScore >= (exercise.passingScore || 70), // 70% passing
      submission.timeSpent,
      submission.powerupsUsed,
      scoreResult.xp,
      scoreResult.mlCoins
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Award ML Coins and XP
   */
  private async awardRewards(userId: string, scoreResult: ScoreResult): Promise<void> {
    // Update user_stats (total_exercises_completed is calculated from exercise_attempts)
    const query = `
      UPDATE gamification_system.user_stats
      SET
        total_xp = total_xp + $1,
        ml_coins = ml_coins + $2,
        ml_coins_earned_total = ml_coins_earned_total + $2,
        updated_at = NOW()
      WHERE user_id = $3
    `;

    await this.pool.query(query, [scoreResult.xp, scoreResult.mlCoins, userId]);

    log.info(`Awarded ${scoreResult.xp} XP and ${scoreResult.mlCoins} ML Coins to user ${userId}`);
  }

  /**
   * Check for achievements after exercise completion
   */
  private async checkAchievements(userId: string, exerciseId: string, scoreResult: ScoreResult, timeSpent: number, hintsUsed: number): Promise<any[]> {
    try {
      const unlockedAchievements = await this.achievementsService.checkAndUnlockAchievements(
        userId,
        {
          exerciseId: exerciseId,
          score: scoreResult.finalScore,
          hintsUsed: hintsUsed,
          timeSpent: timeSpent
        }
      );

      // Return achievements in the format expected by the frontend
      return unlockedAchievements.map(achievement => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        mlCoinsReward: achievement.mlCoinsReward,
        xpReward: achievement.xpReward,
        rarity: achievement.rarity
      }));
    } catch (error) {
      log.error('Error checking achievements after exercise:', error);
      return []; // Don't fail the entire request if achievement check fails
    }
  }

  /**
   * Generate feedback
   */
  private generateFeedback(answers: any, exercise: ExerciseResponse, scoreResult: ScoreResult): any {
    return {
      overall: this.getOverallFeedback(scoreResult.finalScore),
      answerReview: [] // Would generate detailed answer review
    };
  }

  /**
   * Get overall feedback message
   */
  private getOverallFeedback(score: number): string {
    if (score >= 90) return '¡Excelente trabajo! Dominas este tema.';
    if (score >= 70) return '¡Buen trabajo! Vas por buen camino.';
    if (score >= 50) return 'Bien, pero puedes mejorar. Sigue practicando.';
    return 'Necesitas más práctica. Revisa el material y vuelve a intentarlo.';
  }
}
