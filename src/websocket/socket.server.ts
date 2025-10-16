/**
 * Socket.IO Server
 *
 * WebSocket server implementation for real-time notifications.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './socket.auth';
import { log } from '../shared/utils/logger';
import { envConfig } from '../config/env';
import {
  SocketEvent,
  Notification,
  NotificationType,
} from '../modules/notifications/notifications.types';
import { realtimeService } from '../modules/notifications/services/realtime.service';

// Store Socket.IO server instance
let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO Server
 *
 * @param httpServer - HTTP server instance
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: envConfig.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
  });

  // Initialize RealTimeService with Socket.IO instance
  realtimeService.initialize(io);

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userData!.userId;
    const userEmail = socket.userData!.email;

    log.info(`WebSocket client connected: ${userEmail} (${socket.id})`);

    // Register user socket in RealTimeService
    realtimeService.registerUserSocket(userId, socket.id);

    // Join user's personal room for targeted notifications
    socket.join(`user:${userId}`);
    log.debug(`Socket ${socket.id} joined room: user:${userId}`);

    // Emit authenticated event
    socket.emit(SocketEvent.AUTHENTICATED, {
      success: true,
      userId,
      email: userEmail,
      socketId: socket.id,
    });

    /**
     * Handle client marking notification as read
     */
    socket.on(SocketEvent.MARK_AS_READ, async (data: { notificationId: string }) => {
      try {
        const { notificationId } = data;

        log.debug(`User ${userId} marking notification ${notificationId} as read via WebSocket`);

        // Acknowledge to client
        socket.emit(SocketEvent.NOTIFICATION_READ, {
          notificationId,
          success: true,
        });
      } catch (error) {
        log.error('Error handling mark as read:', error);
        socket.emit(SocketEvent.ERROR, {
          message: 'Failed to mark notification as read',
        });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', (reason) => {
      log.info(`WebSocket client disconnected: ${userEmail} (${socket.id}) - Reason: ${reason}`);

      // Unregister user socket from RealTimeService
      realtimeService.unregisterUserSocket(userId, socket.id);
    });

    /**
     * Handle connection errors
     */
    socket.on('error', (error) => {
      log.error(`WebSocket error for ${userEmail}:`, error);
    });
  });

  log.info('Socket.IO server initialized successfully');
  log.info(`WebSocket endpoint: ws://localhost:${envConfig.port}/socket.io/`);

  return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Emit notification to specific user
 *
 * @param userId - Target user ID
 * @param notification - Notification object
 */
export function emitNotificationToUser(userId: string, notification: Notification): void {
  if (!io) {
    log.warn('Socket.IO server not initialized. Cannot emit notification.');
    return;
  }

  const room = `user:${userId}`;

  log.debug(`Emitting notification to room: ${room}`);

  io.to(room).emit(SocketEvent.NEW_NOTIFICATION, {
    notification,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit notification to multiple users
 *
 * @param userIds - Array of user IDs
 * @param notification - Notification object
 */
export function emitNotificationToUsers(userIds: string[], notification: Notification): void {
  if (!io) {
    log.warn('Socket.IO server not initialized. Cannot emit notification.');
    return;
  }

  userIds.forEach((userId) => {
    const room = `user:${userId}`;
    io!.to(room).emit(SocketEvent.NEW_NOTIFICATION, {
      notification,
      timestamp: new Date().toISOString(),
    });
  });

  log.debug(`Emitted notification to ${userIds.length} users`);
}

/**
 * Broadcast notification to all connected users
 *
 * @param notification - Notification object
 */
export function broadcastNotification(notification: Notification): void {
  if (!io) {
    log.warn('Socket.IO server not initialized. Cannot broadcast notification.');
    return;
  }

  io.emit(SocketEvent.NEW_NOTIFICATION, {
    notification,
    timestamp: new Date().toISOString(),
  });

  log.debug('Broadcasted notification to all connected users');
}

/**
 * Emit unread count update to specific user
 *
 * @param userId - Target user ID
 * @param count - Unread notifications count
 */
export function emitUnreadCountUpdate(userId: string, count: number): void {
  if (!io) {
    log.warn('Socket.IO server not initialized. Cannot emit unread count.');
    return;
  }

  const room = `user:${userId}`;

  io.to(room).emit(SocketEvent.UNREAD_COUNT_UPDATED, {
    count,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit notification deleted event
 *
 * @param userId - Target user ID
 * @param notificationId - Deleted notification ID
 */
export function emitNotificationDeleted(userId: string, notificationId: string): void {
  if (!io) {
    log.warn('Socket.IO server not initialized. Cannot emit notification deleted.');
    return;
  }

  const room = `user:${userId}`;

  io.to(room).emit(SocketEvent.NOTIFICATION_DELETED, {
    notificationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get connected users count
 */
export async function getConnectedUsersCount(): Promise<number> {
  if (!io) {
    return 0;
  }

  const sockets = await io.fetchSockets();
  return sockets.length;
}

/**
 * Check if user is connected
 *
 * @param userId - User ID to check
 */
export async function isUserConnected(userId: string): Promise<boolean> {
  if (!io) {
    return false;
  }

  const room = `user:${userId}`;
  const sockets = await io.in(room).fetchSockets();

  return sockets.length > 0;
}

/**
 * Disconnect all sockets (for graceful shutdown)
 */
export function disconnectAllSockets(): void {
  if (!io) {
    return;
  }

  log.info('Disconnecting all WebSocket connections...');
  io.disconnectSockets(true);
  log.info('All WebSocket connections closed');
}
