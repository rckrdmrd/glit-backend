/**
 * Notifications Cron Jobs
 *
 * Scheduled tasks for notifications maintenance and cleanup.
 */

import * as cron from 'node-cron';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { log } from '../../shared/utils/logger';

// Service instances
const notificationsRepository = new NotificationsRepository();
const notificationsService = new NotificationsService(notificationsRepository);

// Store cron tasks
let cleanupTask: cron.ScheduledTask | null = null;

/**
 * Start all notification cron jobs
 */
export function startNotificationsCronJobs(): void {
  log.info('Starting notifications cron jobs...');

  // Cleanup old read notifications daily at 2:00 AM
  cleanupTask = cron.schedule('0 2 * * *', async () => {
    try {
      log.info('Running notifications cleanup cron job...');

      const deletedCount = await notificationsService.cleanupOldNotifications(30);

      log.info(`Notifications cleanup completed. Deleted ${deletedCount} old notifications.`);
    } catch (error) {
      log.error('Error in notifications cleanup cron job:', error);
    }
  });

  log.info('Notifications cron jobs started successfully');
  log.info('  - Cleanup job: Daily at 2:00 AM (deletes read notifications older than 30 days)');
}

/**
 * Stop all notification cron jobs
 */
export function stopNotificationsCronJobs(): void {
  log.info('Stopping notifications cron jobs...');

  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    log.info('Cleanup job stopped');
  }

  log.info('All notifications cron jobs stopped');
}

/**
 * Run cleanup manually (for testing)
 */
export async function runCleanupNow(daysOld: number = 30): Promise<number> {
  try {
    log.info(`Running manual notifications cleanup (${daysOld} days old)...`);

    const deletedCount = await notificationsService.cleanupOldNotifications(daysOld);

    log.info(`Manual cleanup completed. Deleted ${deletedCount} notifications.`);

    return deletedCount;
  } catch (error) {
    log.error('Error in manual cleanup:', error);
    throw error;
  }
}
