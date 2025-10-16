/**
 * Notifications System - Usage Examples
 *
 * This file demonstrates how to use the notifications system
 * from other modules in your application.
 */

import { notifyAchievementUnlocked } from './notifications.helper';
import { sendNotificationToUser } from './notifications.helper';
import { NotificationType } from './notifications.types';
import { emitNotificationToUser } from '../../websocket/socket.server';

/**
 * Example 1: Send achievement notification when user unlocks achievement
 */
export async function exampleAchievementUnlock(userId: string) {
  // This is typically called from gamification service
  await notifyAchievementUnlocked(
    userId,
    'achievement-uuid-123',
    'First Steps',
    'trophy_icon.png',
    100 // ML Coins reward
  );
}

/**
 * Example 2: Send custom notification
 */
export async function exampleCustomNotification(userId: string) {
  await sendNotificationToUser({
    user_id: userId,
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: 'Welcome to GLIT!',
    message: 'Thank you for joining our platform. Complete your first exercise to earn rewards!',
    data: {
      reference_url: '/dashboard',
    },
  });
}

/**
 * Example 3: Send notification within a database transaction
 */
export async function exampleTransactionNotification(userId: string, dbClient: any) {
  // When you're already in a transaction, pass the client
  await sendNotificationToUser(
    {
      user_id: userId,
      type: NotificationType.ML_COINS_EARNED,
      title: 'Coins Earned!',
      message: 'You earned 50 ML Coins for completing a challenge!',
      data: {
        coins_amount: 50,
      },
    },
    dbClient // Pass transaction client
  );
}

/**
 * Example 4: Integration with Gamification Module
 */
export async function onUserLevelUp(userId: string, newLevel: number) {
  const { notifyLevelUp } = require('./notifications.helper');

  await notifyLevelUp(userId, newLevel);

  // The notification is automatically:
  // 1. Saved to database
  // 2. Emitted via WebSocket to connected user
  // 3. Unread count updated
}

/**
 * Example 5: Integration with Exercise Completion
 */
export async function onExerciseComplete(
  userId: string,
  exerciseId: string,
  score: number,
  coinsEarned: number
) {
  const { notifyMLCoinsEarned } = require('./notifications.helper');

  if (score >= 80) {
    await notifyMLCoinsEarned(
      userId,
      coinsEarned,
      `completing exercise with ${score}% score`
    );
  }
}

/**
 * Example 6: Check if user is online before sending
 */
export async function exampleCheckUserOnline(userId: string) {
  const { isUserConnected } = require('../../websocket/socket.server');

  const isOnline = await isUserConnected(userId);

  if (isOnline) {
    console.log(`User ${userId} is online - notification will be delivered in real-time`);
  } else {
    console.log(`User ${userId} is offline - notification will be in database for next login`);
  }

  // Send notification anyway (stored in DB)
  await sendNotificationToUser({
    user_id: userId,
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: 'New Feature Available',
    message: 'Check out our new AI-powered exercises!',
  });
}

/**
 * Example 7: Admin sending broadcast notification
 */
export async function exampleAdminBroadcast() {
  // This is done via REST API
  // POST /api/notifications/send
  // Body: { type: "system_announcement", title: "...", message: "..." }
  // Note: user_id is omitted to broadcast to all users

  console.log('Admin can broadcast via API endpoint /api/notifications/send');
  console.log('Requires admin_teacher or super_admin role');
}

/**
 * Example 8: Integration pattern in your service
 */
export class ExampleService {
  async performAction(userId: string) {
    try {
      // Your business logic here
      const result = await this.doSomething(userId);

      // Send notification after successful action
      await sendNotificationToUser({
        user_id: userId,
        type: NotificationType.MISSION_COMPLETED,
        title: 'Mission Completed!',
        message: 'Great job! You completed the mission.',
        data: {
          mission_id: result.missionId,
          coins_amount: 200,
        },
      });

      return result;
    } catch (error) {
      console.error('Error performing action:', error);
      throw error;
    }
  }

  private async doSomething(userId: string) {
    // Your implementation
    return { missionId: 'mission-123' };
  }
}

/**
 * Example 9: Streak notification on daily login
 */
export async function onUserDailyLogin(userId: string, streakDays: number) {
  const { notifyStreakMilestone } = require('./notifications.helper');

  // Notify on milestone days (7, 30, 60, 90, etc.)
  if ([7, 30, 60, 90, 180, 365].includes(streakDays)) {
    await notifyStreakMilestone(userId, streakDays);
  }
}

/**
 * Example 10: Get notification statistics
 */
export async function exampleGetStats() {
  const { getConnectedUsersCount } = require('../../websocket/socket.server');

  const connectedUsers = await getConnectedUsersCount();
  console.log(`Currently ${connectedUsers} users connected to WebSocket`);
}
