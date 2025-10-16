/**
 * Assignment Validation Schemas
 *
 * Joi validation schemas for assignment endpoints.
 */

import Joi from 'joi';

/**
 * Create Assignment Validation
 */
export const createAssignmentSchema = Joi.object({
  title: Joi.string().required().min(1).max(255).messages({
    'string.empty': 'Assignment title is required',
    'string.min': 'Assignment title must be at least 1 character',
    'string.max': 'Assignment title cannot exceed 255 characters',
  }),
  description: Joi.string().optional().allow('').max(2000).messages({
    'string.max': 'Description cannot exceed 2000 characters',
  }),
  assignment_type: Joi.string()
    .required()
    .valid('practice', 'quiz', 'exam', 'homework')
    .messages({
      'any.only': 'Assignment type must be one of: practice, quiz, exam, homework',
      'any.required': 'Assignment type is required',
    }),
  exercise_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.base': 'exercise_ids must be an array',
      'array.min': 'At least one exercise is required',
      'string.guid': 'Each exercise ID must be a valid UUID',
    }),
  due_date: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'Due date must be in ISO format',
  }),
  total_points: Joi.number().integer().min(0).max(1000).optional().default(100).messages({
    'number.base': 'Total points must be a number',
    'number.integer': 'Total points must be an integer',
    'number.min': 'Total points must be at least 0',
    'number.max': 'Total points cannot exceed 1000',
  }),
});

/**
 * Update Assignment Validation
 */
export const updateAssignmentSchema = Joi.object({
  title: Joi.string().optional().min(1).max(255).messages({
    'string.empty': 'Assignment title cannot be empty',
    'string.min': 'Assignment title must be at least 1 character',
    'string.max': 'Assignment title cannot exceed 255 characters',
  }),
  description: Joi.string().optional().allow('').max(2000).messages({
    'string.max': 'Description cannot exceed 2000 characters',
  }),
  assignment_type: Joi.string()
    .optional()
    .valid('practice', 'quiz', 'exam', 'homework')
    .messages({
      'any.only': 'Assignment type must be one of: practice, quiz, exam, homework',
    }),
  due_date: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'Due date must be in ISO format',
  }),
  total_points: Joi.number().integer().min(0).max(1000).optional().messages({
    'number.base': 'Total points must be a number',
    'number.integer': 'Total points must be an integer',
    'number.min': 'Total points must be at least 0',
    'number.max': 'Total points cannot exceed 1000',
  }),
  is_published: Joi.boolean().optional().messages({
    'boolean.base': 'is_published must be a boolean',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Assign To Validation
 */
export const assignToSchema = Joi.object({
  classroom_ids: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .messages({
      'array.base': 'classroom_ids must be an array',
      'string.guid': 'Each classroom ID must be a valid UUID',
    }),
  student_ids: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .messages({
      'array.base': 'student_ids must be an array',
      'string.guid': 'Each student ID must be a valid UUID',
    }),
}).or('classroom_ids', 'student_ids').messages({
  'object.missing': 'At least one of classroom_ids or student_ids must be provided',
});

/**
 * Grade Submission Validation
 */
export const gradeSubmissionSchema = Joi.object({
  score: Joi.number().min(0).max(100).required().messages({
    'number.base': 'Score must be a number',
    'number.min': 'Score must be at least 0',
    'number.max': 'Score cannot exceed 100',
    'any.required': 'Score is required',
  }),
  feedback: Joi.string().optional().allow('').max(2000).messages({
    'string.max': 'Feedback cannot exceed 2000 characters',
  }),
});
