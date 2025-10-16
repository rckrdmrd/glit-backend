/**
 * Notifications Routes
 *
 * Route definitions for notifications endpoints.
 */

import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { applyRLS } from '../../middleware/rls.middleware';
import {
  getNotificationsSchema,
  notificationIdSchema,
  sendNotificationSchema,
} from './notifications.validation';

// Initialize dependencies
const notificationsRepository = new NotificationsRepository();
const notificationsService = new NotificationsService(notificationsRepository);
const notificationsController = new NotificationsController(notificationsService);

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateJWT);
router.use(applyRLS);

/**
 * GET /api/notifications
 * Get user notifications with pagination and filters
 */
router.get(
  '/',
  validate(getNotificationsSchema, 'query'),
  notificationsController.getNotifications
);

/**
 * GET /api/notifications/unread-count
 * Get unread notifications count
 * IMPORTANT: This must be before /:id route
 */
router.get(
  '/unread-count',
  notificationsController.getUnreadCount
);

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 * IMPORTANT: This must be before /:id route
 */
router.post(
  '/read-all',
  notificationsController.markAllAsRead
);

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications for the user
 * IMPORTANT: This must be before /:id route
 */
router.delete(
  '/clear-all',
  notificationsController.clearAllNotifications
);

/**
 * POST /api/notifications/send
 * Send notification (Admin only)
 * IMPORTANT: This must be before /:id route
 */
router.post(
  '/send',
  requireRole('admin_teacher', 'super_admin'),
  requirePermission('notifications:send'),
  validate(sendNotificationSchema, 'body'),
  notificationsController.sendNotification
);

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch(
  '/:id/read',
  validate(notificationIdSchema, 'params'),
  notificationsController.markAsRead
);

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete(
  '/:id',
  validate(notificationIdSchema, 'params'),
  notificationsController.deleteNotification
);

export default router;

// Export service instance for WebSocket server
export { notificationsService };
