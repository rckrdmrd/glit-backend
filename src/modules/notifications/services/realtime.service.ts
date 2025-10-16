/**
 * Real-Time Service
 *
 * Dedicated service for managing real-time WebSocket communications
 * for the notifications system.
 */

import { Server as SocketIOServer } from 'socket.io';
import { log } from '../../../shared/utils/logger';
import {
  Notification,
  SocketEvent,
} from '../notifications.types';

/**
 * Real-Time Service Class
 *
 * Handles all WebSocket-related operations for notifications.
 */
export class RealTimeService {
  private io: SocketIOServer | null = null;
  private onlineUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  /**
   * Initialize the service with Socket.IO instance
   */
  initialize(io: SocketIOServer): void {
    this.io = io;
    log.info('RealTimeService initialized');
  }

  /**
   * Register a user's socket connection
   *
   * @param userId - User ID
   * @param socketId - Socket ID
   */
  registerUserSocket(userId: string, socketId: string): void {
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }

    this.onlineUsers.get(userId)!.add(socketId);
    log.debug(`User ${userId} socket ${socketId} registered. Total sockets: ${this.onlineUsers.get(userId)!.size}`);
  }

  /**
   * Unregister a user's socket connection
   *
   * @param userId - User ID
   * @param socketId - Socket ID
   */
  unregisterUserSocket(userId: string, socketId: string): void {
    const userSockets = this.onlineUsers.get(userId);

    if (userSockets) {
      userSockets.delete(socketId);

      if (userSockets.size === 0) {
        this.onlineUsers.delete(userId);
        log.debug(`User ${userId} fully disconnected`);
      } else {
        log.debug(`User ${userId} socket ${socketId} removed. Remaining sockets: ${userSockets.size}`);
      }
    }
  }

  /**
   * Check if user is currently online
   *
   * @param userId - User ID to check
   * @returns True if user has at least one active connection
   */
  isUserOnline(userId: string): boolean {
    const userSockets = this.onlineUsers.get(userId);
    return userSockets ? userSockets.size > 0 : false;
  }

  /**
   * Get list of all online user IDs
   *
   * @returns Array of user IDs currently connected
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  /**
   * Get user's socket IDs
   *
   * @param userId - User ID
   * @returns Set of socket IDs for the user
   */
  getUserSocketIds(userId: string): Set<string> {
    return this.onlineUsers.get(userId) || new Set();
  }

  /**
   * Get total number of online users
   *
   * @returns Count of unique users online
   */
  getOnlineUsersCount(): number {
    return this.onlineUsers.size;
  }

  /**
   * Get total number of socket connections
   *
   * @returns Total count of all socket connections
   */
  getTotalConnectionsCount(): number {
    let total = 0;
    this.onlineUsers.forEach((sockets) => {
      total += sockets.size;
    });
    return total;
  }

  /**
   * Emit new notification to specific user
   *
   * @param userId - Target user ID
   * @param notification - Notification object
   */
  emitNotification(userId: string, notification: Notification): void {
    if (!this.io) {
      log.warn('Socket.IO not initialized. Cannot emit notification.');
      return;
    }

    const room = `user:${userId}`;

    this.io.to(room).emit(SocketEvent.NEW_NOTIFICATION, {
      notification,
      timestamp: new Date().toISOString(),
    });

    log.debug(`Notification emitted to user ${userId} in room ${room}`);
  }

  /**
   * Emit notification to multiple users
   *
   * @param userIds - Array of target user IDs
   * @param notification - Notification object
   */
  emitNotificationToMultiple(userIds: string[], notification: Notification): void {
    if (!this.io) {
      log.warn('Socket.IO not initialized. Cannot emit notifications.');
      return;
    }

    userIds.forEach((userId) => {
      this.emitNotification(userId, notification);
    });

    log.debug(`Notification emitted to ${userIds.length} users`);
  }

  /**
   * Broadcast notification to all connected users
   *
   * @param notification - Notification object
   */
  broadcastNotification(notification: Notification): void {
    if (!this.io) {
      log.warn('Socket.IO not initialized. Cannot broadcast notification.');
      return;
    }

    this.io.emit(SocketEvent.NEW_NOTIFICATION, {
      notification,
      timestamp: new Date().toISOString(),
    });

    log.debug('Notification broadcasted to all connected users');
  }

  /**
   * Emit notification read event
   *
   * @param userId - Target user ID
   * @param notificationId - ID of the notification marked as read
   */
  emitNotificationRead(userId: string, notificationId: string): void {
    if (!this.io) {
      return;
    }

    const room = `user:${userId}`;

    this.io.to(room).emit(SocketEvent.NOTIFICATION_READ, {
      notificationId,
      timestamp: new Date().toISOString(),
    });

    log.debug(`Notification read event emitted for ${notificationId} to user ${userId}`);
  }

  /**
   * Emit notification deleted event
   *
   * @param userId - Target user ID
   * @param notificationId - ID of the deleted notification
   */
  emitNotificationDeleted(userId: string, notificationId: string): void {
    if (!this.io) {
      return;
    }

    const room = `user:${userId}`;

    this.io.to(room).emit(SocketEvent.NOTIFICATION_DELETED, {
      notificationId,
      timestamp: new Date().toISOString(),
    });

    log.debug(`Notification deleted event emitted for ${notificationId} to user ${userId}`);
  }

  /**
   * Emit unread count update
   *
   * @param userId - Target user ID
   * @param count - Updated unread count
   */
  emitUnreadCountUpdate(userId: string, count: number): void {
    if (!this.io) {
      return;
    }

    const room = `user:${userId}`;

    this.io.to(room).emit(SocketEvent.UNREAD_COUNT_UPDATED, {
      count,
      timestamp: new Date().toISOString(),
    });

    log.debug(`Unread count (${count}) emitted to user ${userId}`);
  }

  /**
   * Emit to a specific room
   *
   * @param roomId - Room identifier
   * @param event - Event name
   * @param data - Data to emit
   */
  emitToRoom(roomId: string, event: string, data: any): void {
    if (!this.io) {
      log.warn('Socket.IO not initialized. Cannot emit to room.');
      return;
    }

    this.io.to(roomId).emit(event, data);
    log.debug(`Event ${event} emitted to room ${roomId}`);
  }

  /**
   * Get Socket.IO server instance
   *
   * @returns Socket.IO server instance or null
   */
  getSocketServer(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Get presence statistics
   *
   * @returns Object with online users count and connections count
   */
  getPresenceStats(): {
    onlineUsers: number;
    totalConnections: number;
    usersList: string[];
  } {
    return {
      onlineUsers: this.getOnlineUsersCount(),
      totalConnections: this.getTotalConnectionsCount(),
      usersList: this.getOnlineUsers(),
    };
  }

  /**
   * Disconnect all sockets (for graceful shutdown)
   */
  disconnectAll(): void {
    if (!this.io) {
      return;
    }

    log.info('Disconnecting all WebSocket connections...');
    this.io.disconnectSockets(true);
    this.onlineUsers.clear();
    log.info('All WebSocket connections closed');
  }
}

// Export singleton instance
export const realtimeService = new RealTimeService();
