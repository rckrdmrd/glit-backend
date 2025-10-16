/**
 * Classroom Validation Schemas
 *
 * Joi validation schemas for classroom endpoints.
 */

import Joi from 'joi';

/**
 * Create Classroom Validation
 */
export const createClassroomSchema = Joi.object({
  name: Joi.string().required().min(1).max(255).messages({
    'string.empty': 'Classroom name is required',
    'string.min': 'Classroom name must be at least 1 character',
    'string.max': 'Classroom name cannot exceed 255 characters',
  }),
  description: Joi.string().optional().allow('').max(1000).messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),
  school_id: Joi.string().uuid().optional().allow(null).messages({
    'string.guid': 'School ID must be a valid UUID',
  }),
  grade_level: Joi.string().optional().allow('').max(50).messages({
    'string.max': 'Grade level cannot exceed 50 characters',
  }),
  subject: Joi.string().optional().allow('').max(100).messages({
    'string.max': 'Subject cannot exceed 100 characters',
  }),
});

/**
 * Update Classroom Validation
 */
export const updateClassroomSchema = Joi.object({
  name: Joi.string().optional().min(1).max(255).messages({
    'string.empty': 'Classroom name cannot be empty',
    'string.min': 'Classroom name must be at least 1 character',
    'string.max': 'Classroom name cannot exceed 255 characters',
  }),
  description: Joi.string().optional().allow('').max(1000).messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),
  grade_level: Joi.string().optional().allow('').max(50).messages({
    'string.max': 'Grade level cannot exceed 50 characters',
  }),
  subject: Joi.string().optional().allow('').max(100).messages({
    'string.max': 'Subject cannot exceed 100 characters',
  }),
  is_active: Joi.boolean().optional().messages({
    'boolean.base': 'is_active must be a boolean',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Add Students Validation
 */
export const addStudentsSchema = Joi.object({
  student_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.base': 'student_ids must be an array',
      'array.min': 'At least one student ID is required',
      'string.guid': 'Each student ID must be a valid UUID',
    }),
});

/**
 * Pagination Query Validation
 */
export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  sortBy: Joi.string().optional().valid('name', 'created_at', 'updated_at').default('created_at'),
  order: Joi.string().optional().valid('asc', 'desc').default('desc'),
});
