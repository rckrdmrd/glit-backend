/**
 * Notifications Helper
 *
 * Utility functions to emit notifications from other modules.
 */

import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  NotificationType,
  NotificationData,
} from './notifications.types';
import {
  emitNotificationToUser,
  emitUnreadCountUpdate,
} from '../../websocket/socket.server';
import { PoolClient } from 'pg';
import { log } from '../../shared/utils/logger';

// Initialize service
const notificationsRepository = new NotificationsRepository();
const notificationsService = new NotificationsService(notificationsRepository);

/**
 * Send notification to user (creates in DB and emits via WebSocket)
 *
 * @param dto - Notification data
 * @param client - Optional database client for transactions
 */
export async function sendNotificationToUser(
  dto: CreateNotificationDto,
  client?: PoolClient
): Promise<void> {
  try {
    // Create notification in database
    const notification = await notificationsService.createNotification(dto, client);

    // Emit via WebSocket to connected user
    emitNotificationToUser(dto.user_id, notification);

    // Get updated unread count
    const unreadCount = await notificationsRepository.getUnreadCount(dto.user_id, client);

    // Emit unread count update
    emitUnreadCountUpdate(dto.user_id, unreadCount);

    log.info(`Notification sent to user ${dto.user_id}: ${dto.type}`);
  } catch (error) {
    log.error('Error sending notification to user:', error);
    throw error;
  }
}

/**
 * Notify achievement unlocked
 */
export async function notifyAchievementUnlocked(
  userId: string,
  achievementId: string,
  achievementName: string,
  achievementIcon: string,
  coinsReward: number,
  client?: PoolClient
): Promise<void> {
  const data: NotificationData = {
    achievement_id: achievementId,
    achievement_name: achievementName,
    achievement_icon: achievementIcon,
    coins_amount: coinsReward,
  };

  await sendNotificationToUser(
    {
      user_id: userId,
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: '¡Logro Desbloqueado!',
      message: `Has desbloqueado el logro "${achievementName}" y ganado ${coinsReward} ML Coins.`,
      data,
    },
    client
  );
}

/**
 * Notify level up
 */
export async function notifyLevelUp(
  userId: string,
  newLevel: number,
  client?: PoolClient
): Promise<void> {
  const data: NotificationData = {
    level: newLevel,
  };

  await sendNotificationToUser(
    {
      user_id: userId,
      type: NotificationType.LEVEL_UP,
      title: '¡Subiste de Nivel!',
      message: `¡Felicidades! Has alcanzado el nivel ${newLevel}.`,
      data,
    },
    client
  );
}

/**
 * Notify ML Coins earned
 */
export async function notifyMLCoinsEarned(
  userId: string,
  amount: number,
  reason: string,
  client?: PoolClient
): Promise<void> {
  const data: NotificationData = {
    coins_amount: amount,
  };

  await sendNotificationToUser(
    {
      user_id: userId,
      type: NotificationType.ML_COINS_EARNED,
      title: '¡ML Coins Ganados!',
      message: `Has ganado ${amount} ML Coins por ${reason}.`,
      data,
    },
    client
  );
}

/**
 * Notify mission completed
 */
export async function notifyMissionCompleted(
  userId: string,
  missionId: string,
  missionName: string,
  reward: number,
  client?: PoolClient
): Promise<void> {
  const data: NotificationData = {
    mission_id: missionId,
    mission_name: missionName,
    coins_amount: reward,
  };

  await sendNotificationToUser(
    {
      user_id: userId,
      type: NotificationType.MISSION_COMPLETED,
      title: '¡Misión Completada!',
      message: `Has completado la misión "${missionName}" y ganado ${reward} ML Coins.`,
      data,
    },
    client
  );
}

/**
 * Notify streak milestone
 */
export async function notifyStreakMilestone(
  userId: string,
  streakDays: number,
  client?: PoolClient
): Promise<void> {
  const data: NotificationData = {
    streak_days: streakDays,
  };

  await sendNotificationToUser(
    {
      user_id: userId,
      type: NotificationType.STREAK_MILESTONE,
      title: '¡Racha Increíble!',
      message: `¡Felicidades! Has mantenido una racha de ${streakDays} días consecutivos.`,
      data,
    },
    client
  );
}

/**
 * Notify exercise feedback
 */
export async function notifyExerciseFeedback(
  userId: string,
  exerciseId: string,
  message: string,
  client?: PoolClient
): Promise<void> {
  const data: NotificationData = {
    exercise_id: exerciseId,
  };

  await sendNotificationToUser(
    {
      user_id: userId,
      type: NotificationType.EXERCISE_FEEDBACK,
      title: 'Retroalimentación de Ejercicio',
      message,
      data,
    },
    client
  );
}

/**
 * Notify system announcement
 */
export async function notifySystemAnnouncement(
  userId: string,
  title: string,
  message: string,
  referenceUrl?: string,
  client?: PoolClient
): Promise<void> {
  const data: NotificationData = {
    reference_url: referenceUrl,
  };

  await sendNotificationToUser(
    {
      user_id: userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title,
      message,
      data,
    },
    client
  );
}
