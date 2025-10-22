/**
 * Server Entry Point
 *
 * Main server initialization and startup.
 */

import { createServer } from 'http';
import { createApp } from './app';
import { envConfig, validateEnv } from './config/env';
import { testConnection, closePool } from './database/pool';
import { log } from './shared/utils/logger';
import { initializeSocketServer, disconnectAllSockets } from './websocket/socket.server';
import { startMissionsCronJobs, stopMissionsCronJobs } from './modules/gamification/missions/missions.cron';
import { startNotificationsCronJobs, stopNotificationsCronJobs } from './modules/notifications/notifications.cron';
// TODO: Implement these cron jobs
// import { startDailyResetCronJobs, stopDailyResetCronJobs } from './cron/daily-reset.cron';
// import { startStreaksCronJobs, stopStreaksCronJobs } from './cron/streaks.cron';
// import { startLeaderboardsCronJobs, stopLeaderboardsCronJobs } from './cron/leaderboards.cron';

/**
 * Bootstrap Application
 *
 * Initializes and starts the server.
 */
async function bootstrap(): Promise<void> {
  try {
    // Validate environment variables
    validateEnv();

    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const PORT = envConfig.port;
    const httpServer = createServer(app);

    // Initialize Socket.IO server
    initializeSocketServer(httpServer);

    // Initialize cron jobs
    startMissionsCronJobs();
    startNotificationsCronJobs();
    // TODO: Implement these cron jobs
    // startDailyResetCronJobs();
    // startStreaksCronJobs();
    // startLeaderboardsCronJobs();

    // Start server
    httpServer.listen(PORT, () => {
      log.info('='.repeat(50));
      log.info('GLIT Platform Backend Server');
      log.info('='.repeat(50));
      log.info(`Environment: ${envConfig.nodeEnv}`);
      log.info(`Server running on: http://localhost:${PORT}`);
      log.info(`API Base URL: http://localhost:${PORT}/api`);
      log.info(`WebSocket URL: ws://localhost:${PORT}/socket.io/`);
      log.info('='.repeat(50));
      log.info('Available Endpoints:');
      log.info(`  - Health Check:    http://localhost:${PORT}/api/health`);
      log.info(`  - Database Health: http://localhost:${PORT}/api/health/db`);
      log.info(`  - Authentication:  http://localhost:${PORT}/api/auth`);
      log.info(`  - Gamification:    http://localhost:${PORT}/api/gamification`);
      log.info(`  - Notifications:   http://localhost:${PORT}/api/notifications`);
      log.info('='.repeat(50));
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      log.info(`\n${signal} received. Starting graceful shutdown...`);

      // Stop cron jobs
      stopMissionsCronJobs();
      stopNotificationsCronJobs();
      // TODO: Implement these cron jobs
      // stopDailyResetCronJobs();
      // stopStreaksCronJobs();
      // stopLeaderboardsCronJobs();

      // Disconnect all WebSocket connections
      disconnectAllSockets();

      // Close HTTP server
      httpServer.close(async () => {
        log.info('HTTP server closed');

        // Close database connections
        try {
          await closePool();
          log.info('Database connections closed');
        } catch (error) {
          log.error('Error closing database connections:', error);
        }

        log.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        log.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      log.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason: any) => {
      log.error('Unhandled Rejection:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
bootstrap();
