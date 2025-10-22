/**
 * Exercise Sanitization Utilities
 *
 * Functions to sanitize exercise data before storage or response
 */

/**
 * Sanitize multiple exercises
 */
export function sanitizeExercises(exercises: any[]): any[] {
  return exercises.map(sanitizeExercise);
}

/**
 * Sanitize exercise content to remove sensitive data
 */
export function sanitizeExercise(exercise: any): any {
  if (!exercise) {
    return exercise;
  }

  const sanitized = { ...exercise };

  // Remove correct answers if present (for student view)
  if (sanitized.correctAnswer) {
    delete sanitized.correctAnswer;
  }

  if (sanitized.correct_answer) {
    delete sanitized.correct_answer;
  }

  // Remove scoring rubric details (internal use only)
  if (sanitized.scoringRubric && typeof sanitized.scoringRubric === 'object') {
    sanitized.scoringRubric = {
      maxScore: sanitized.scoringRubric.maxScore || 100,
      // Hide detailed criteria
    };
  }

  return sanitized;
}

/**
 * Sanitize exercise for teacher view (includes answers)
 */
export function sanitizeExerciseForTeacher(exercise: any): any {
  if (!exercise) {
    return exercise;
  }

  // Teachers get full exercise data
  return { ...exercise };
}

/**
 * Sanitize exercise for student view (hides answers)
 */
export function sanitizeExerciseForStudent(exercise: any): any {
  return sanitizeExercise(exercise);
}
