/**
 * Submit Exercise DTO
 *
 * Data Transfer Objects and validation for exercise submissions
 */

import Joi from 'joi';

export interface SubmitExercisePayload {
  userId: string;
  exerciseId: string;
  answer?: any;
  answers?: any; // Alias for answer (backward compatibility)
  timeSpent: number;
  hintsUsed: number;
  powerupsUsed?: ('pistas' | 'vision_lectora' | 'segunda_oportunidad')[];
  comodinesUsed?: {
    type: 'pistas' | 'vision_lectora' | 'segunda_oportunidad';
    count: number;
  }[];
  attemptNumber?: number;
  startedAt?: string | Date; // Timestamp when user started the exercise
  sessionId?: string; // Session identifier for tracking
}

/**
 * Validation schema for exercise submission
 */
export const submitExerciseSchema = Joi.object({
  // Support both answer and answers for backward compatibility
  answer: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array(),
    Joi.object()
  ).optional(),
  answers: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array(),
    Joi.object()
  ).optional(),
  startedAt: Joi.alternatives().try(
    Joi.number(),
    Joi.date(),
    Joi.string()
  ).required(),
  hintsUsed: Joi.number().min(0).default(0),
  powerupsUsed: Joi.array().items(
    Joi.string().valid('pistas', 'vision_lectora', 'segunda_oportunidad')
  ).optional().default([]),
  comodinesUsed: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('pistas', 'vision_lectora', 'segunda_oportunidad').required(),
      count: Joi.number().min(1).required()
    })
  ).optional(),
  sessionId: Joi.string().optional(),
  attemptNumber: Joi.number().min(1).default(1)
}).or('answer', 'answers'); // At least one of answer or answers is required

/**
 * Validate submission payload
 * Throws an error if validation fails
 */
export function validateSubmission(payload: any): any {
  const { error, value } = submitExerciseSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    const err: any = new Error('Validation failed');
    err.errors = errorDetails;
    throw err;
  }

  // Normalize: if answers is provided but not answer, copy it
  if (value.answers && !value.answer) {
    value.answer = value.answers;
  }

  return value;
}
