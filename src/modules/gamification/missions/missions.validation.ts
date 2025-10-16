/**
 * Missions Validation Schemas
 *
 * Joi validation schemas for missions endpoints.
 */

import Joi from 'joi';

/**
 * Claim rewards schema
 */
export const claimRewardsSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
});

/**
 * Complete mission schema
 */
export const completeMissionSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
});

/**
 * Get mission progress schema
 */
export const getMissionProgressSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
});

/**
 * Get user missions schema
 */
export const getUserMissionsSchema = Joi.object({
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
  query: Joi.object({
    status: Joi.string().optional(),
    type: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
});

/**
 * Check missions progress schema
 */
export const checkMissionsProgressSchema = Joi.object({
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    actionType: Joi.string()
      .valid(
        'exercises_completed',
        'ml_coins_earned',
        'modules_completed',
        'powerups_used',
        'achievements_unlocked',
        'perfect_scores',
        'streak_maintained',
        'friends_helped',
        'login_days',
        'rank_up',
        'guild_joined',
        'exercises_no_hints',
        'weekly_exercises',
        'total_xp_earned'
      )
      .required(),
    amount: Joi.number().integer().min(1).optional().default(1),
    metadata: Joi.object().optional(),
  }),
});

/**
 * Get user mission stats schema
 */
export const getUserMissionStatsSchema = Joi.object({
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
});
