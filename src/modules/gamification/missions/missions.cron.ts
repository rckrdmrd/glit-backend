/**
 * Missions Cron Jobs
 *
 * Scheduled tasks for automatic mission management.
 */

import cron from 'node-cron';
import { pool } from '../../../database/pool';
import { MissionsRepository } from './missions.repository';
import { MissionsService } from './missions.service';
import {
  getRandomDailyTemplates,
  getRandomWeeklyTemplates,
} from './missions.templates';
import { log } from '../../../shared/utils/logger';

// Initialize dependencies
const missionsRepository = new MissionsRepository(pool);
const missionsService = new MissionsService(missionsRepository);

/**
 * Daily Missions Reset
 *
 * Runs every day at 00:00 UTC
 * Cron: 0 0 * * *
 *
 * Tasks:
 * 1. Expire old daily missions
 * 2. Generate new daily missions for active users
 */
export const dailyMissionsReset = cron.schedule('0 0 * * *', async () => {
  try {
    log.info('[CRON] Starting daily missions reset...');

    const startTime = Date.now();

    // Step 1: Expire old missions
    const expiredCount = await missionsRepository.expireMissions();
    log.info(`[CRON] Expired ${expiredCount} missions`);

    // Step 2: Get active users
    const activeUserIds = await missionsRepository.getActiveUserIds();
    log.info(`[CRON] Found ${activeUserIds.length} active users`);

    // Step 3: Create daily missions for each user
    let successCount = 0;
    let errorCount = 0;

    for (const userId of activeUserIds) {
      try {
        // Check if user already has active daily missions
        const existingMissions = await missionsRepository.getActiveMissionsByType(
          userId,
          'daily'
        );

        if (existingMissions.length === 0) {
          // Generate 3 random daily missions
          const templates = getRandomDailyTemplates(3);

          // Daily missions expire at end of day (23:59:59 UTC)
          const endDate = new Date();
          endDate.setUTCHours(23, 59, 59, 999);

          for (const template of templates) {
            const objectives = template.objectives.map((obj) => ({
              ...obj,
              current: 0,
            }));

            await missionsRepository.createMission(
              userId,
              template.id,
              template.title,
              template.description,
              'daily',
              objectives,
              template.rewards,
              endDate
            );
          }

          successCount++;
        }
      } catch (error) {
        log.error(`[CRON] Error creating daily missions for user ${userId}:`, error);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;

    log.info('[CRON] Daily missions reset completed');
    log.info(`[CRON] Stats: ${successCount} users processed, ${errorCount} errors`);
    log.info(`[CRON] Duration: ${duration}ms`);
  } catch (error) {
    log.error('[CRON] Error in daily missions reset:', error);
  }
});

/**
 * Weekly Missions Reset
 *
 * Runs every Monday at 00:00 UTC
 * Cron: 0 0 * * 1
 *
 * Tasks:
 * 1. Expire old weekly missions
 * 2. Generate new weekly missions for active users
 */
export const weeklyMissionsReset = cron.schedule('0 0 * * 1', async () => {
  try {
    log.info('[CRON] Starting weekly missions reset...');

    const startTime = Date.now();

    // Step 1: Expire old weekly missions
    const expiredCount = await missionsRepository.expireMissions();
    log.info(`[CRON] Expired ${expiredCount} weekly missions`);

    // Step 2: Get active users
    const activeUserIds = await missionsRepository.getActiveUserIds();
    log.info(`[CRON] Found ${activeUserIds.length} active users`);

    // Step 3: Calculate next Monday
    const getNextMonday = (): Date => {
      const now = new Date();
      const nextMonday = new Date(now);
      nextMonday.setUTCDate(now.getUTCDate() + 7);
      nextMonday.setUTCHours(0, 0, 0, 0);
      return nextMonday;
    };

    const endDate = getNextMonday();

    // Step 4: Create weekly missions for each user
    let successCount = 0;
    let errorCount = 0;

    for (const userId of activeUserIds) {
      try {
        // Check if user already has active weekly missions
        const existingMissions = await missionsRepository.getActiveMissionsByType(
          userId,
          'weekly'
        );

        if (existingMissions.length === 0) {
          // Generate 5 random weekly missions
          const templates = getRandomWeeklyTemplates(5);

          for (const template of templates) {
            const objectives = template.objectives.map((obj) => ({
              ...obj,
              current: 0,
            }));

            await missionsRepository.createMission(
              userId,
              template.id,
              template.title,
              template.description,
              'weekly',
              objectives,
              template.rewards,
              endDate
            );
          }

          successCount++;
        }
      } catch (error) {
        log.error(`[CRON] Error creating weekly missions for user ${userId}:`, error);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;

    log.info('[CRON] Weekly missions reset completed');
    log.info(`[CRON] Stats: ${successCount} users processed, ${errorCount} errors`);
    log.info(`[CRON] Duration: ${duration}ms`);
  } catch (error) {
    log.error('[CRON] Error in weekly missions reset:', error);
  }
});

/**
 * Check Missions Progress
 *
 * Runs every hour
 * Cron: 0 * * * *
 *
 * Tasks:
 * 1. Check all active missions
 * 2. Auto-complete missions that reached 100% progress
 */
export const checkMissionsProgress = cron.schedule('0 * * * *', async () => {
  try {
    log.info('[CRON] Checking missions progress...');

    const startTime = Date.now();

    // Get active users
    const activeUserIds = await missionsRepository.getActiveUserIds();

    let missionsChecked = 0;
    let missionsCompleted = 0;

    for (const userId of activeUserIds) {
      try {
        const completedMissions = await missionsService.checkMissionsProgress(userId);
        missionsChecked += 1;
        missionsCompleted += completedMissions.length;
      } catch (error) {
        log.error(`[CRON] Error checking missions for user ${userId}:`, error);
      }
    }

    const duration = Date.now() - startTime;

    log.info('[CRON] Missions progress check completed');
    log.info(`[CRON] Stats: ${missionsChecked} users checked, ${missionsCompleted} missions auto-completed`);
    log.info(`[CRON] Duration: ${duration}ms`);
  } catch (error) {
    log.error('[CRON] Error in check missions progress:', error);
  }
});

/**
 * Cleanup Expired Missions
 *
 * Runs every day at 03:00 UTC
 * Cron: 0 3 * * *
 *
 * Tasks:
 * 1. Delete expired missions older than 30 days
 */
export const cleanupExpiredMissions = cron.schedule('0 3 * * *', async () => {
  try {
    log.info('[CRON] Starting cleanup of expired missions...');

    const deletedCount = await missionsRepository.deleteExpiredMissions(30);

    log.info(`[CRON] Cleanup completed. Deleted ${deletedCount} expired missions`);
  } catch (error) {
    log.error('[CRON] Error in cleanup expired missions:', error);
  }
});

/**
 * Initialize all cron jobs
 */
export function startMissionsCronJobs(): void {
  log.info('[CRON] Initializing missions cron jobs...');

  dailyMissionsReset.start();
  log.info('[CRON] ✓ Daily missions reset: 0 0 * * * (every day at 00:00 UTC)');

  weeklyMissionsReset.start();
  log.info('[CRON] ✓ Weekly missions reset: 0 0 * * 1 (every Monday at 00:00 UTC)');

  checkMissionsProgress.start();
  log.info('[CRON] ✓ Check missions progress: 0 * * * * (every hour)');

  cleanupExpiredMissions.start();
  log.info('[CRON] ✓ Cleanup expired missions: 0 3 * * * (every day at 03:00 UTC)');

  log.info('[CRON] All missions cron jobs started successfully');
}

/**
 * Stop all cron jobs
 */
export function stopMissionsCronJobs(): void {
  log.info('[CRON] Stopping missions cron jobs...');

  dailyMissionsReset.stop();
  weeklyMissionsReset.stop();
  checkMissionsProgress.stop();
  cleanupExpiredMissions.stop();

  log.info('[CRON] All missions cron jobs stopped');
}
