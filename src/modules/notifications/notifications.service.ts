/**
 * Notifications Service
 *
 * Business logic for notifications management.
 */

import { PoolClient } from 'pg';
import { NotificationsRepository } from './notifications.repository';
import {
  Notification,
  CreateNotificationDto,
  SendNotificationDto,
  NotificationQueryParams,
  PaginatedNotifications,
  UnreadCountResponse,
} from './notifications.types';
import { log } from '../../shared/utils/logger';
import { ErrorCode } from '../../shared/types';
import { AppError } from '../../middleware/error.middleware';

export class NotificationsService {
  constructor(private notificationsRepository: NotificationsRepository) {}

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    params: NotificationQueryParams,
    client?: PoolClient
  ): Promise<PaginatedNotifications> {
    try {
      const { notifications, total } = await this.notificationsRepository.findByUserId(
        userId,
        params,
        client
      );

      const unreadCount = await this.notificationsRepository.getUnreadCount(userId, client);

      const page = params.page || 1;
      const limit = params.limit || 20;
      const totalPages = Math.ceil(total / limit);

      return {
        notifications,
        total,
        page,
        limit,
        totalPages,
        unreadCount,
      };
    } catch (error) {
      log.error('Error getting user notifications:', error);
      throw new AppError(
        'Failed to retrieve notifications',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
    client?: PoolClient
  ): Promise<Notification> {
    try {
      // Verify notification exists and belongs to user
      const notification = await this.notificationsRepository.findById(
        notificationId,
        client
      );

      if (!notification) {
        throw new AppError(
          'Notification not found',
          404,
          ErrorCode.NOT_FOUND
        );
      }

      if (notification.user_id !== userId) {
        throw new AppError(
          'Unauthorized to access this notification',
          403,
          ErrorCode.FORBIDDEN
        );
      }

      if (notification.read) {
        return notification; // Already read
      }

      const updated = await this.notificationsRepository.markAsRead(
        notificationId,
        userId,
        client
      );

      if (!updated) {
        throw new AppError(
          'Failed to mark notification as read',
          500,
          ErrorCode.INTERNAL_ERROR
        );
      }

      log.info(`Notification ${notificationId} marked as read by user ${userId}`);
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;

      log.error('Error marking notification as read:', error);
      throw new AppError(
        'Failed to mark notification as read',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(
    userId: string,
    client?: PoolClient
  ): Promise<{ count: number }> {
    try {
      const count = await this.notificationsRepository.markAllAsRead(userId, client);

      log.info(`${count} notifications marked as read for user ${userId}`);

      return { count };
    } catch (error) {
      log.error('Error marking all notifications as read:', error);
      throw new AppError(
        'Failed to mark all notifications as read',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
    client?: PoolClient
  ): Promise<void> {
    try {
      // Verify notification exists and belongs to user
      const notification = await this.notificationsRepository.findById(
        notificationId,
        client
      );

      if (!notification) {
        throw new AppError(
          'Notification not found',
          404,
          ErrorCode.NOT_FOUND
        );
      }

      if (notification.user_id !== userId) {
        throw new AppError(
          'Unauthorized to delete this notification',
          403,
          ErrorCode.FORBIDDEN
        );
      }

      const deleted = await this.notificationsRepository.delete(
        notificationId,
        userId,
        client
      );

      if (!deleted) {
        throw new AppError(
          'Failed to delete notification',
          500,
          ErrorCode.INTERNAL_ERROR
        );
      }

      log.info(`Notification ${notificationId} deleted by user ${userId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;

      log.error('Error deleting notification:', error);
      throw new AppError(
        'Failed to delete notification',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(
    userId: string,
    client?: PoolClient
  ): Promise<UnreadCountResponse> {
    try {
      const count = await this.notificationsRepository.getUnreadCount(userId, client);

      return { count };
    } catch (error) {
      log.error('Error getting unread count:', error);
      throw new AppError(
        'Failed to get unread count',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Create notification (internal use)
   */
  async createNotification(
    dto: CreateNotificationDto,
    client?: PoolClient
  ): Promise<Notification> {
    try {
      const notification = await this.notificationsRepository.create(dto, client);

      log.info(
        `Notification created: ${notification.type} for user ${notification.user_id}`
      );

      return notification;
    } catch (error) {
      log.error('Error creating notification:', error);
      throw new AppError(
        'Failed to create notification',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Send notification (Admin only)
   * If user_id is not provided, sends to all users
   */
  async sendNotification(
    dto: SendNotificationDto,
    client?: PoolClient
  ): Promise<{ sent: number; notifications: Notification[] }> {
    try {
      if (dto.user_id) {
        // Send to single user
        const notification = await this.createNotification(
          {
            user_id: dto.user_id,
            type: dto.type,
            title: dto.title,
            message: dto.message,
            data: dto.data,
          },
          client
        );

        return {
          sent: 1,
          notifications: [notification],
        };
      } else {
        // Send to all users (broadcast)
        // Get all active user IDs
        const dbClient = client || (await this.getUserIds());
        const userIds = await this.getUserIds(client);

        if (userIds.length === 0) {
          return {
            sent: 0,
            notifications: [],
          };
        }

        const count = await this.notificationsRepository.createBulk(
          userIds,
          dto.type,
          dto.title,
          dto.message,
          dto.data,
          client
        );

        log.info(`Broadcast notification sent to ${count} users`);

        return {
          sent: count,
          notifications: [], // Don't return all notifications for broadcast
        };
      }
    } catch (error) {
      log.error('Error sending notification:', error);
      throw new AppError(
        'Failed to send notification',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get all active user IDs (for broadcast)
   */
  private async getUserIds(client?: PoolClient): Promise<string[]> {
    const dbClient = client || (await import('../../database/pool')).pool;

    const query = `
      SELECT id
      FROM auth.users
      WHERE deleted_at IS NULL
      ORDER BY id
    `;

    const result = await dbClient.query(query);
    return result.rows.map((row: any) => row.id);
  }

  /**
   * Clear all notifications for a user
   */
  async clearAllNotifications(
    userId: string,
    client?: PoolClient
  ): Promise<{ count: number }> {
    try {
      const count = await this.notificationsRepository.clearAll(userId, client);

      log.info(`${count} notifications cleared for user ${userId}`);

      return { count };
    } catch (error) {
      log.error('Error clearing all notifications:', error);
      throw new AppError(
        'Failed to clear all notifications',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Cleanup old read notifications
   */
  async cleanupOldNotifications(
    daysOld: number = 30,
    client?: PoolClient
  ): Promise<number> {
    try {
      const count = await this.notificationsRepository.deleteOldReadNotifications(
        daysOld,
        client
      );

      log.info(`Cleaned up ${count} old read notifications`);
      return count;
    } catch (error) {
      log.error('Error cleaning up old notifications:', error);
      throw new AppError(
        'Failed to cleanup old notifications',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }
  }
}
