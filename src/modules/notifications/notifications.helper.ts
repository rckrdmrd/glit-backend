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
 * @param dto - Notification data (user_id should be auth user ID from JWT)
 * @param client - Optional database client for transactions
 */
export async function sendNotificationToUser(
  dto: CreateNotificationDto,
  client?: PoolClient
): Promise<void> {
  try {
    // Convert auth user_id to profile_id
    const { pool } = await import('../../database/pool');
    const dbClient = client || pool;

    const profileQuery = `
      SELECT p.id as profile_id
      FROM auth_management.profiles p
      WHERE p.user_id = $1
    `;
    const profileResult = await dbClient.query(profileQuery, [dto.user_id]);

    if (!profileResult.rows[0]) {
      log.error(`Profile not found for user ${dto.user_id}, skipping notification`);
      return; // Skip notification if profile doesn't exist
    }

    const profileId = profileResult.rows[0].profile_id;

    // Create notification with profile_id
    const notificationDto = {
      ...dto,
      user_id: profileId // Use profile_id instead of auth user_id
    };

    const notification = await notificationsService.createNotification(notificationDto, client);

    // Emit via WebSocket to connected user (using original auth user_id)
    emitNotificationToUser(dto.user_id, notification);

    // Get updated unread count (using profile_id)
    const unreadCount = await notificationsRepository.getUnreadCount(profileId, client);

    // Emit unread count update (using original auth user_id)
    emitUnreadCountUpdate(dto.user_id, unreadCount);

    log.info(`Notification sent to user ${dto.user_id} (profile ${profileId}): ${dto.type}`);
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
      type: 'achievement' as any, // Use existing DB type
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
 * Notify rank up
 */
export async function notifyRankUp(
  userId: string,
  newRank: string,
  previousRank: string,
  bonusCoins: number,
  client?: PoolClient
): Promise<void> {
  const data: NotificationData = {
    rank: newRank,
    previous_rank: previousRank,
    coins_amount: bonusCoins,
  };

  await sendNotificationToUser(
    {
      user_id: userId,
      type: 'reward' as any, // Use existing DB type for rank ups
      title: '¡Ascenso de Rango!',
      message: `¡Felicidades! Has ascendido de ${previousRank.toUpperCase()} a ${newRank.toUpperCase()}. Bonus: ${bonusCoins} ML Coins.`,
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
      type: 'reward' as any, // Use existing DB type for streaks
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
