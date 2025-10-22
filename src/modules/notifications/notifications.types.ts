/**
 * Notifications Types
 *
 * TypeScript interfaces and types for the notifications system.
 */

/**
 * Notification Type Enum
 */
export enum NotificationType {
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  RANK_UP = 'rank_up',
  FRIEND_REQUEST = 'friend_request',
  GUILD_INVITATION = 'guild_invitation',
  MISSION_COMPLETED = 'mission_completed',
  LEVEL_UP = 'level_up',
  MESSAGE_RECEIVED = 'message_received',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  ML_COINS_EARNED = 'ml_coins_earned',
  STREAK_MILESTONE = 'streak_milestone',
  EXERCISE_FEEDBACK = 'exercise_feedback',
}

/**
 * Notification Interface (from notifications table)
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  read: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Notification Data (JSON field with additional context)
 */
export interface NotificationData {
  achievement_id?: string;
  achievement_name?: string;
  achievement_icon?: string;
  rank?: string;
  previous_rank?: string;
  friend_id?: string;
  friend_name?: string;
  guild_id?: string;
  guild_name?: string;
  mission_id?: string;
  mission_name?: string;
  level?: number;
  coins_amount?: number;
  streak_days?: number;
  exercise_id?: string;
  reference_url?: string;
  [key: string]: any;
}

/**
 * Create Notification DTO
 */
export interface CreateNotificationDto {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
}

/**
 * Send Notification DTO (Admin only)
 */
export interface SendNotificationDto {
  user_id?: string; // If not provided, sends to all users
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
}

/**
 * Update Notification DTO
 */
export interface UpdateNotificationDto {
  read?: boolean;
}

/**
 * Notification List Query Params
 */
export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  read?: boolean;
  sort?: 'asc' | 'desc';
}

/**
 * Paginated Notifications Response
 */
export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

/**
 * Unread Count Response
 */
export interface UnreadCountResponse {
  count: number;
}

/**
 * WebSocket Events
 */
export enum SocketEvent {
  // Client -> Server
  AUTHENTICATE = 'authenticate',
  MARK_AS_READ = 'notification:mark_read',
  DISCONNECT = 'disconnect',

  // Server -> Client
  NEW_NOTIFICATION = 'notification:new',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_DELETED = 'notification:deleted',
  UNREAD_COUNT_UPDATED = 'notification:unread_count',
  ERROR = 'error',
  AUTHENTICATED = 'authenticated',
}

/**
 * Socket Authentication Payload
 */
export interface SocketAuthPayload {
  token: string;
}

/**
 * Socket User Data
 */
export interface SocketUserData {
  userId: string;
  email: string;
  role: string;
}
