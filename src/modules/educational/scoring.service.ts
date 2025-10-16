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

export class ScoringService {
  constructor(private pool: Pool) {}

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

    // Award rewards (ML Coins, XP)
    await this.awardRewards(submission.userId, scoreResult);

    // Check for achievements
    const achievements = await this.checkAchievements(submission.userId, scoreResult);

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

      case ExerciseType.CRUCIGRAMA_CIENTIFICO:
        return this.scoreCrucigrama(answers, exercise);

      case ExerciseType.SOPA_LETRAS:
        return this.scoreSopaLetras(answers, exercise);

      case ExerciseType.EMPAREJAMIENTO:
        return this.scoreEmparejamiento(answers, exercise);

      case ExerciseType.LINEA_TIEMPO_VISUAL:
        return this.scoreLineaTiempo(answers, exercise);

      case ExerciseType.QUIZ_TIKTOK:
        return this.scoreQuizTikTok(answers, exercise);

      case ExerciseType.COMPRENSION_AUDITIVA:
        return this.scoreComprensionAuditiva(answers, exercise);

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
    let correctPositions = 0;

    events.forEach((event: any, index: number) => {
      if (answers.positions?.[event.id] === event.correctPosition) {
        correctPositions++;
      }
    });

    return (correctPositions / events.length) * 100;
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
      difficulty: this.getDifficultyMultiplier(exercise.difficulty),
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
    const query = `
      SELECT
        current_rank as "currentRank",
        streak_days as "streakDays",
        total_xp as "totalXP"
      FROM gamification_system.user_stats
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
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
    const query = `
      INSERT INTO progress_tracking.exercise_attempts (
        user_id, exercise_id, submitted_answers, score,
        is_correct, time_spent_seconds, comodines_used,
        xp_earned, ml_coins_earned
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      submission.userId,
      submission.exerciseId,
      submission.answers,
      scoreResult.finalScore,
      scoreResult.finalScore >= (exercise.pointsReward * 0.7), // 70% passing
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
    // Update user_stats
    const query = `
      UPDATE gamification_system.user_stats
      SET
        total_xp = total_xp + $1,
        ml_coins = ml_coins + $2,
        ml_coins_earned_total = ml_coins_earned_total + $2,
        total_exercises_completed = total_exercises_completed + 1,
        updated_at = NOW()
      WHERE user_id = $3
    `;

    await this.pool.query(query, [scoreResult.xp, scoreResult.mlCoins, userId]);
  }

  /**
   * Check for achievements
   */
  private async checkAchievements(userId: string, scoreResult: ScoreResult): Promise<any[]> {
    // Simplified - would implement full achievement checking logic
    return [];
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
