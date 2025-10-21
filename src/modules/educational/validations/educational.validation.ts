/**
 * Educational Module Joi Validation Schemas
 * 
 * Centralized validation schemas for educational content endpoints
 * including modules, exercises, and progress tracking.
 */

import Joi from 'joi';

/**
 * Common UUID validation
 */
const uuidSchema = Joi.string()
  .uuid()
  .messages({
    'string.guid': 'Must be a valid UUID',
    'any.required': 'ID is required',
  });

/**
 * Module validation schemas
 */
export const createModuleSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Module title is required',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title must not exceed 200 characters',
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Module description is required',
      'string.max': 'Description must not exceed 1000 characters',
    }),
  level: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.min': 'Level must be between 1 and 5',
      'number.max': 'Level must be between 1 and 5',
    }),
  order: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.min': 'Order must be a positive integer',
    }),
  estimatedHours: Joi.number()
    .min(0)
    .optional(),
  prerequisites: Joi.array()
    .items(uuidSchema)
    .optional()
    .default([]),
  learningObjectives: Joi.array()
    .items(Joi.string().trim().max(500))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one learning objective is required',
    }),
  status: Joi.string()
    .valid('draft', 'published', 'archived')
    .default('draft'),
});

export const updateModuleSchema = createModuleSchema.fork(
  ['title', 'description', 'level', 'order', 'learningObjectives'],
  (schema) => schema.optional()
);

/**
 * Exercise validation schemas
 */
export const createExerciseSchema = Joi.object({
  moduleId: uuidSchema.required(),
  type: Joi.string()
    .valid(
      // Module 1 - Comprensión Literal
      'sopa_letras', 'mapa_conceptual', 'crucigrama', 'timeline',
      'emparejamiento', 'verdadero_falso', 'completar_espacios',
      // Module 2 - Inferencia
      'rueda_inferencias', 'puzzle_contexto', 'detective_textual',
      'construccion_hipotesis', 'prediccion_narrativa',
      // Module 3 - Argumentación
      'tribunal_opiniones', 'debate_digital', 'analisis_fuentes',
      'podcast_argumentativo', 'matriz_perspectivas',
      // Module 4 - Multimodalidad
      'verificador_fake_news', 'navegacion_hipertextual',
      'analisis_memes', 'infografia_interactiva', 'quiz_tiktok',
      // Module 5 - Metacognición
      'portfolio_reflexivo', 'red_aprendizaje', 'diario_metacognitivo',
      'autoevaluacion_adaptativa', 'meta_reto_final'
    )
    .required()
    .messages({
      'any.only': 'Invalid exercise type',
      'any.required': 'Exercise type is required',
    }),
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required(),
  description: Joi.string()
    .trim()
    .max(2000)
    .optional(),
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard')
    .required()
    .messages({
      'any.only': 'Difficulty must be: easy, medium, or hard',
    }),
  estimatedMinutes: Joi.number()
    .integer()
    .min(1)
    .max(180)
    .optional()
    .messages({
      'number.min': 'Estimated time must be at least 1 minute',
      'number.max': 'Estimated time must not exceed 180 minutes',
    }),
  maxScore: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100)
    .messages({
      'number.min': 'Max score must be at least 1',
      'number.max': 'Max score must not exceed 1000',
    }),
  passingScore: Joi.number()
    .integer()
    .min(1)
    .max(Joi.ref('maxScore'))
    .default(70)
    .messages({
      'number.max': 'Passing score cannot exceed max score',
    }),
  order: Joi.number()
    .integer()
    .min(1)
    .required(),
  content: Joi.object().required(),
  hints: Joi.array()
    .items(Joi.object({
      text: Joi.string().required(),
      cost: Joi.number().integer().min(0).default(5),
    }))
    .optional()
    .default([]),
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .optional()
    .default([]),
  xpReward: Joi.number()
    .integer()
    .min(0)
    .default(10),
  mlCoinsReward: Joi.number()
    .integer()
    .min(0)
    .default(5),
  status: Joi.string()
    .valid('draft', 'published', 'archived')
    .default('draft'),
});

export const updateExerciseSchema = createExerciseSchema.fork(
  ['moduleId', 'type', 'title', 'difficulty', 'order', 'content'],
  (schema) => schema.optional()
);

/**
 * Exercise submission validation schema
 */
export const submitExerciseSchema = Joi.object({
  exerciseId: uuidSchema.required(),
  answers: Joi.alternatives()
    .try(
      Joi.object(),  // For object-based answers
      Joi.array(),   // For array-based answers
      Joi.string(),  // For text-based answers
    )
    .required()
    .messages({
      'any.required': 'Answers are required',
    }),
  timeSpent: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.min': 'Time spent must be a positive number',
      'any.required': 'Time spent is required',
    }),
  hintsUsed: Joi.array()
    .items(Joi.number().integer().min(0))
    .optional()
    .default([]),
  powerupsUsed: Joi.array()
    .items(uuidSchema)
    .optional()
    .default([]),
});

/**
 * Progress query validation schema
 */
export const progressQuerySchema = Joi.object({
  userId: uuidSchema.required(),
  moduleId: uuidSchema.optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0),
});

/**
 * Activity filter validation schema
 */
export const activityFilterSchema = Joi.object({
  type: Joi.string()
    .valid('exercise_completed', 'module_started', 'module_completed', 'achievement_unlocked')
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0),
});

export default {
  createModuleSchema,
  updateModuleSchema,
  createExerciseSchema,
  updateExerciseSchema,
  submitExerciseSchema,
  progressQuerySchema,
  activityFilterSchema,
};
