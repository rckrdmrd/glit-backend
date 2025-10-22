/**
 * Exercise Validators
 *
 * Validation functions for different exercise types
 */

import { ExerciseType } from '../educational.types';

/**
 * Placeholder for exercise content validator
 */
export class ExerciseContentValidator {
  validate(exerciseType: any, content: any): { isValid: boolean; errors?: Array<{ severity: string; field: string; message: string }> } {
    // TODO: Implement comprehensive content validation
    return { isValid: true, errors: [] };
  }

  static validate(content: any): { valid: boolean; errors?: string[] } {
    // TODO: Implement comprehensive content validation
    return { valid: true };
  }
}

/**
 * Validate answer format for specific exercise type
 */
export function validateAnswerFormat(exerciseType: ExerciseType, answer: any): {
  valid: boolean;
  error?: string;
} {
  // Convert exercise types to string for comparison
  const typeStr = String(exerciseType);

  switch (typeStr) {
    case 'multiple_choice':
    case 'true_false':
      if (typeof answer !== 'string') {
        return {
          valid: false,
          error: 'Answer must be a string for multiple choice/true-false questions'
        };
      }
      return { valid: true };

    case 'fill_in_blank':
    case 'short_answer':
      if (typeof answer !== 'string') {
        return {
          valid: false,
          error: 'Answer must be a string for fill-in-blank/short-answer questions'
        };
      }
      return { valid: true };

    case 'matching':
    case 'ordering':
      if (!Array.isArray(answer)) {
        return {
          valid: false,
          error: 'Answer must be an array for matching/ordering questions'
        };
      }
      return { valid: true };

    case 'essay':
    case 'paragraph_completion':
      if (typeof answer !== 'string') {
        return {
          valid: false,
          error: 'Answer must be a string for essay/paragraph questions'
        };
      }
      return { valid: true };

    case 'multiple_select':
      if (!Array.isArray(answer)) {
        return {
          valid: false,
          error: 'Answer must be an array for multiple select questions'
        };
      }
      return { valid: true };

    case 'image_labeling':
    case 'drag_and_drop':
      if (typeof answer !== 'object' || answer === null) {
        return {
          valid: false,
          error: 'Answer must be an object for image labeling/drag-and-drop questions'
        };
      }
      return { valid: true };

    default:
      // For other exercise types, accept any format
      return { valid: true };
  }
}

/**
 * Sanitize user answer to prevent injection attacks
 */
export function sanitizeAnswer(answer: any): any {
  if (typeof answer === 'string') {
    // Remove potentially dangerous characters
    return answer.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  if (Array.isArray(answer)) {
    return answer.map(sanitizeAnswer);
  }

  if (typeof answer === 'object' && answer !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(answer)) {
      sanitized[key] = sanitizeAnswer(value);
    }
    return sanitized;
  }

  return answer;
}
