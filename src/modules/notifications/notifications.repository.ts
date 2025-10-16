/**
 * Notifications Repository
 *
 * Database operations for notifications.
 */

import { PoolClient } from 'pg';
import { pool } from '../../database/pool';
import {
  Notification,
  CreateNotificationDto,
  NotificationQueryParams,
  NotificationType,
} from './notifications.types';

export class NotificationsRepository {
  /**
   * Create a new notification
   */
  async create(
    dto: CreateNotificationDto,
    client?: PoolClient
  ): Promise<Notification> {
    const dbClient = client || pool;

    const query = `
      INSERT INTO gamification_system.notifications (
        user_id,
        type,
        title,
        message,
        data,
        read
      )
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING *
    `;

    const values = [
      dto.user_id,
      dto.type,
      dto.title,
      dto.message,
      dto.data ? JSON.stringify(dto.data) : null,
    ];

    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Get notifications by user ID with pagination and filters
   */
  async findByUserId(
    userId: string,
    params: NotificationQueryParams,
    client?: PoolClient
  ): Promise<{ notifications: Notification[]; total: number }> {
    const dbClient = client || pool;

    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const sort = params.sort || 'desc';

    // Build WHERE clause
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (params.type) {
      conditions.push(`type = $${paramIndex}`);
      values.push(params.type);
      paramIndex++;
    }

    if (params.read !== undefined) {
      conditions.push(`read = $${paramIndex}`);
      values.push(params.read);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM gamification_system.notifications
      WHERE ${whereClause}
    `;

    const countResult = await dbClient.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT *
      FROM gamification_system.notifications
      WHERE ${whereClause}
      ORDER BY created_at ${sort.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await dbClient.query(query, values);

    return {
      notifications: result.rows,
      total,
    };
  }

  /**
   * Find notification by ID
   */
  async findById(
    id: string,
    client?: PoolClient
  ): Promise<Notification | null> {
    const dbClient = client || pool;

    const query = `
      SELECT *
      FROM gamification_system.notifications
      WHERE id = $1
    `;

    const result = await dbClient.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    id: string,
    userId: string,
    client?: PoolClient
  ): Promise<Notification | null> {
    const dbClient = client || pool;

    const query = `
      UPDATE gamification_system.notifications
      SET read = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await dbClient.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    userId: string,
    client?: PoolClient
  ): Promise<number> {
    const dbClient = client || pool;

    const query = `
      UPDATE gamification_system.notifications
      SET read = true, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND read = false
      RETURNING id
    `;

    const result = await dbClient.query(query, [userId]);
    return result.rowCount || 0;
  }

  /**
   * Delete notification
   */
  async delete(
    id: string,
    userId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const dbClient = client || pool;

    const query = `
      DELETE FROM gamification_system.notifications
      WHERE id = $1 AND user_id = $2
    `;

    const result = await dbClient.query(query, [id, userId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(
    userId: string,
    client?: PoolClient
  ): Promise<number> {
    const dbClient = client || pool;

    const query = `
      SELECT COUNT(*) as count
      FROM gamification_system.notifications
      WHERE user_id = $1 AND read = false
    `;

    const result = await dbClient.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldReadNotifications(
    daysOld: number = 30,
    client?: PoolClient
  ): Promise<number> {
    const dbClient = client || pool;

    const query = `
      DELETE FROM gamification_system.notifications
      WHERE read = true
        AND created_at < NOW() - INTERVAL '${daysOld} days'
    `;

    const result = await dbClient.query(query);
    return result.rowCount || 0;
  }

  /**
   * Create notification for multiple users (bulk)
   */
  async createBulk(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    client?: PoolClient
  ): Promise<number> {
    const dbClient = client || pool;

    if (userIds.length === 0) return 0;

    // Build values for bulk insert
    const valueStrings: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    userIds.forEach((userId) => {
      valueStrings.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, false)`
      );
      values.push(userId, type, title, message, data ? JSON.stringify(data) : null);
      paramIndex += 5;
    });

    const query = `
      INSERT INTO gamification_system.notifications (
        user_id,
        type,
        title,
        message,
        data,
        read
      )
      VALUES ${valueStrings.join(', ')}
    `;

    const result = await dbClient.query(query, values);
    return result.rowCount || 0;
  }

  /**
   * Clear all notifications for a user (delete all)
   */
  async clearAll(
    userId: string,
    client?: PoolClient
  ): Promise<number> {
    const dbClient = client || pool;

    const query = `
      DELETE FROM gamification_system.notifications
      WHERE user_id = $1
    `;

    const result = await dbClient.query(query, [userId]);
    return result.rowCount || 0;
  }
}
