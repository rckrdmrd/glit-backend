/**
 * WebSocket Authentication Middleware
 *
 * JWT authentication for Socket.IO connections.
 */

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { jwtConfig, JWTPayload } from '../config/jwt';
import { log } from '../shared/utils/logger';
import { SocketUserData } from '../modules/notifications/notifications.types';

/**
 * Extended Socket interface with user data
 */
export interface AuthenticatedSocket extends Socket {
  userData?: SocketUserData;
}

/**
 * Socket.IO Authentication Middleware
 *
 * Verifies JWT token from handshake auth or query params.
 * Attaches user data to socket instance.
 */
export const socketAuthMiddleware = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    // Extract token from auth object or query params
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      log.warn('WebSocket connection attempt without token');
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const payload = jwt.verify(token, jwtConfig.secret) as JWTPayload;

    // Attach user data to socket
    socket.userData = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    log.info(`WebSocket authenticated: ${socket.userData.email} (${socket.userData.userId})`);

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      log.warn('WebSocket authentication failed: Invalid token');
      return next(new Error('Invalid authentication token'));
    }

    if (error instanceof jwt.TokenExpiredError) {
      log.warn('WebSocket authentication failed: Token expired');
      return next(new Error('Authentication token expired'));
    }

    log.error('WebSocket authentication error:', error);
    return next(new Error('Authentication failed'));
  }
};

/**
 * Verify if socket user is admin
 */
export const isAdmin = (socket: AuthenticatedSocket): boolean => {
  return (
    socket.userData?.role === 'admin_teacher' ||
    socket.userData?.role === 'super_admin'
  );
};

/**
 * Verify if socket user owns a resource
 */
export const isResourceOwner = (
  socket: AuthenticatedSocket,
  userId: string
): boolean => {
  return socket.userData?.userId === userId;
};
