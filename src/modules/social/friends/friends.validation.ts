/**
 * Friends Validation Schemas
 *
 * Joi validation schemas for friends endpoints.
 */

import Joi from 'joi';

/**
 * Send friend request validation
 */
export const sendFriendRequestSchema = Joi.object({
  addresseeId: Joi.string().uuid().required().messages({
    'string.guid': 'addresseeId must be a valid UUID',
    'any.required': 'addresseeId is required',
  }),
});

/**
 * Search users validation
 */
export const searchUsersSchema = Joi.object({
  q: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Search query must be at least 2 characters',
    'string.max': 'Search query must not exceed 100 characters',
    'any.required': 'Search query (q) is required',
  }),
});
