/**
 * Notifications Validation Schemas
 *
 * Joi validation schemas for notifications endpoints.
 */

import Joi from 'joi';
import { NotificationType } from './notifications.types';

/**
 * Validation schema for get notifications query params
 */
export const getNotificationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .optional(),
  read: Joi.boolean().optional(),
  sort: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * Validation schema for notification ID param
 */
export const notificationIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * Validation schema for send notification (admin)
 */
export const sendNotificationSchema = Joi.object({
  user_id: Joi.string().uuid().optional().allow(null),
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .required(),
  title: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).max(1000).required(),
  data: Joi.object().optional().allow(null),
});

/**
 * Validation schema for create notification (internal)
 */
export const createNotificationSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .required(),
  title: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).max(1000).required(),
  data: Joi.object().optional().allow(null),
});
