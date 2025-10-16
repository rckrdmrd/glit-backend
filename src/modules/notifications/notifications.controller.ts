/**
 * Notifications Controller
 *
 * HTTP request handlers for notifications endpoints.
 */

import { Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthRequest } from '../../shared/types';
import {
  NotificationQueryParams,
  SendNotificationDto,
} from './notifications.types';
import { log } from '../../shared/utils/logger';

export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * Get user notifications
   *
   * GET /api/notifications
   */
  getNotifications = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;

      const params: NotificationQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        type: req.query.type as any,
        read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
        sort: (req.query.sort as 'asc' | 'desc') || 'desc',
      };

      const result = await this.notificationsService.getUserNotifications(
        userId,
        params,
        req.dbClient
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mark notification as read
   *
   * PATCH /api/notifications/:id/read
   */
  markAsRead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const notification = await this.notificationsService.markAsRead(
        id,
        userId,
        req.dbClient
      );

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete notification
   *
   * DELETE /api/notifications/:id
   */
  deleteNotification = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await this.notificationsService.deleteNotification(
        id,
        userId,
        req.dbClient
      );

      res.json({
        success: true,
        data: {
          message: 'Notification deleted successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mark all notifications as read
   *
   * POST /api/notifications/read-all
   */
  markAllAsRead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;

      const result = await this.notificationsService.markAllAsRead(
        userId,
        req.dbClient
      );

      res.json({
        success: true,
        data: {
          message: `${result.count} notifications marked as read`,
          count: result.count,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get unread count
   *
   * GET /api/notifications/unread-count
   */
  getUnreadCount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;

      const result = await this.notificationsService.getUnreadCount(
        userId,
        req.dbClient
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear all notifications
   *
   * DELETE /api/notifications/clear-all
   */
  clearAllNotifications = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;

      const result = await this.notificationsService.clearAllNotifications(
        userId,
        req.dbClient
      );

      res.json({
        success: true,
        data: {
          message: `${result.count} notifications cleared`,
          count: result.count,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send notification (Admin only)
   *
   * POST /api/notifications/send
   */
  sendNotification = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const dto: SendNotificationDto = req.body;

      const result = await this.notificationsService.sendNotification(
        dto,
        req.dbClient
      );

      log.info(
        `Admin ${req.user!.email} sent notification to ${dto.user_id || 'all users'}`
      );

      res.status(201).json({
        success: true,
        data: {
          message: dto.user_id
            ? 'Notification sent successfully'
            : `Broadcast notification sent to ${result.sent} users`,
          sent: result.sent,
          notifications: result.notifications,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
