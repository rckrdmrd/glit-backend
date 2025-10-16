/**
 * Guilds Validation Schemas
 *
 * Joi validation schemas for guilds endpoints.
 */

import Joi from 'joi';

/**
 * Create guild validation
 */
export const createGuildSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Guild name must be at least 3 characters',
    'string.max': 'Guild name must not exceed 50 characters',
    'any.required': 'Guild name is required',
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  motto: Joi.string().max(100).optional().allow('').messages({
    'string.max': 'Motto must not exceed 100 characters',
  }),
  colorPrimary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
    'string.pattern.base': 'Color must be a valid hex color (e.g., #3B82F6)',
  }),
  colorSecondary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
    'string.pattern.base': 'Color must be a valid hex color (e.g., #10B981)',
  }),
  maxMembers: Joi.number().integer().min(2).max(100).optional().messages({
    'number.min': 'Max members must be at least 2',
    'number.max': 'Max members must not exceed 100',
  }),
  isPublic: Joi.boolean().optional(),
  allowJoinRequests: Joi.boolean().optional(),
  requireApproval: Joi.boolean().optional(),
});

/**
 * Update guild validation
 */
export const updateGuildSchema = Joi.object({
  name: Joi.string().min(3).max(50).optional().messages({
    'string.min': 'Guild name must be at least 3 characters',
    'string.max': 'Guild name must not exceed 50 characters',
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  motto: Joi.string().max(100).optional().allow('').messages({
    'string.max': 'Motto must not exceed 100 characters',
  }),
  colorPrimary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
    'string.pattern.base': 'Color must be a valid hex color',
  }),
  colorSecondary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
    'string.pattern.base': 'Color must be a valid hex color',
  }),
  avatarUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Avatar URL must be a valid URI',
  }),
  bannerUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Banner URL must be a valid URI',
  }),
  maxMembers: Joi.number().integer().min(2).max(100).optional().messages({
    'number.min': 'Max members must be at least 2',
    'number.max': 'Max members must not exceed 100',
  }),
  isPublic: Joi.boolean().optional(),
  allowJoinRequests: Joi.boolean().optional(),
  requireApproval: Joi.boolean().optional(),
});

/**
 * Create guild challenge validation
 */
export const createChallengeSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Challenge title must be at least 3 characters',
    'string.max': 'Challenge title must not exceed 100 characters',
    'any.required': 'Challenge title is required',
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  challengeType: Joi.string().valid('xp_goal', 'modules_completion', 'achievement_hunt', 'custom').required().messages({
    'any.only': 'Challenge type must be one of: xp_goal, modules_completion, achievement_hunt, custom',
    'any.required': 'Challenge type is required',
  }),
  targetValue: Joi.number().integer().min(1).required().messages({
    'number.min': 'Target value must be at least 1',
    'any.required': 'Target value is required',
  }),
  rewardXp: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'Reward XP must be non-negative',
  }),
  rewardCoins: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'Reward coins must be non-negative',
  }),
  startDate: Joi.date().iso().required().messages({
    'any.required': 'Start date is required',
  }),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required',
  }),
});

/**
 * Update member role validation
 */
export const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'member').required().messages({
    'any.only': 'Role must be either "admin" or "member"',
    'any.required': 'Role is required',
  }),
});
