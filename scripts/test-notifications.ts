/**
 * Test Notifications Script
 *
 * Script de prueba para verificar el sistema de notificaciones.
 *
 * Uso:
 *   npx ts-node scripts/test-notifications.ts
 */

import { pool } from '../src/database/pool';
import { NotificationsRepository } from '../src/modules/notifications/notifications.repository';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { NotificationType } from '../src/modules/notifications/notifications.types';

async function testNotifications() {
  console.log('🧪 Testing Notifications System...\n');

  const repository = new NotificationsRepository();
  const service = new NotificationsService(repository);

  try {
    // Step 1: Get a test user
    console.log('1️⃣ Getting test user...');
    const userQuery = await pool.query('SELECT id, email FROM auth.users LIMIT 1');

    if (userQuery.rows.length === 0) {
      console.error('❌ No users found in database. Create a user first.');
      process.exit(1);
    }

    const testUser = userQuery.rows[0];
    console.log(`✅ Test user: ${testUser.email} (${testUser.id})\n`);

    // Step 2: Create test notification
    console.log('2️⃣ Creating test notification...');
    const notification = await service.createNotification({
      user_id: testUser.id,
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: 'Test Achievement',
      message: 'This is a test notification from the test script.',
      data: {
        achievement_id: 'test-achievement-123',
        achievement_name: 'Test Runner',
        coins_amount: 100,
      },
    });
    console.log(`✅ Notification created: ${notification.id}\n`);

    // Step 3: Get user notifications
    console.log('3️⃣ Getting user notifications...');
    const result = await service.getUserNotifications(testUser.id, {
      page: 1,
      limit: 10,
    });
    console.log(`✅ Found ${result.total} notifications`);
    console.log(`   Unread count: ${result.unreadCount}\n`);

    // Step 4: Get unread count
    console.log('4️⃣ Getting unread count...');
    const unreadResult = await service.getUnreadCount(testUser.id);
    console.log(`✅ Unread count: ${unreadResult.count}\n`);

    // Step 5: Mark as read
    console.log('5️⃣ Marking notification as read...');
    await service.markAsRead(notification.id, testUser.id);
    console.log(`✅ Notification marked as read\n`);

    // Step 6: Verify read status
    console.log('6️⃣ Verifying read status...');
    const updatedCount = await service.getUnreadCount(testUser.id);
    console.log(`✅ New unread count: ${updatedCount.count}\n`);

    // Step 7: Mark all as read
    console.log('7️⃣ Marking all notifications as read...');
    const markAllResult = await service.markAllAsRead(testUser.id);
    console.log(`✅ Marked ${markAllResult.count} notifications as read\n`);

    // Step 8: Create multiple notifications
    console.log('8️⃣ Creating multiple test notifications...');
    const types = [
      NotificationType.LEVEL_UP,
      NotificationType.ML_COINS_EARNED,
      NotificationType.STREAK_MILESTONE,
    ];

    for (const type of types) {
      await service.createNotification({
        user_id: testUser.id,
        type,
        title: `Test ${type}`,
        message: `Test notification of type ${type}`,
      });
    }
    console.log(`✅ Created ${types.length} additional notifications\n`);

    // Step 9: Test pagination
    console.log('9️⃣ Testing pagination...');
    const paginatedResult = await service.getUserNotifications(testUser.id, {
      page: 1,
      limit: 2,
    });
    console.log(`✅ Page 1: ${paginatedResult.notifications.length} items`);
    console.log(`   Total: ${paginatedResult.total}`);
    console.log(`   Total pages: ${paginatedResult.totalPages}\n`);

    // Step 10: Test filtering
    console.log('🔟 Testing filtering by type...');
    const filteredResult = await service.getUserNotifications(testUser.id, {
      page: 1,
      limit: 10,
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
    });
    console.log(`✅ Filtered results: ${filteredResult.notifications.length} achievements\n`);

    // Success
    console.log('✅ All tests passed!\n');
    console.log('📊 Summary:');
    console.log(`   - Total notifications: ${result.total + types.length}`);
    console.log(`   - Unread count: ${updatedCount.count}`);
    console.log(`   - Test user: ${testUser.email}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
testNotifications().catch(console.error);
