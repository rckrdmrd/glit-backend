/**
 * Express Application
 *
 * Main Express application setup and configuration.
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { envConfig } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { log } from './shared/utils/logger';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import gamificationRoutes from './modules/gamification/gamification.routes';
import healthRoutes from './modules/health/health.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import { createEducationalRoutes } from './modules/educational';
import { createTeacherRoutes } from './modules/teacher';
import { createSocialRoutes } from './modules/social';
import { createAdminRoutes } from './modules/admin';
import { pool } from './database/pool';

/**
 * Create Express Application
 *
 * @returns Configured Express app instance
 */
export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: envConfig.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware (development only)
  if (envConfig.nodeEnv === 'development') {
    app.use((req, res, next) => {
      log.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  // API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/gamification', gamificationRoutes);
  app.use('/api/notifications', notificationsRoutes);

  // Educational routes (includes modules, exercises, progress, and analytics)
  const educationalRoutes = createEducationalRoutes(pool);
  app.use('/api/educational', educationalRoutes);
  app.use('/api/progress', educationalRoutes);
  app.use('/api/analytics', educationalRoutes);

  // Teacher routes (includes classrooms, assignments, analytics)
  const teacherRoutes = createTeacherRoutes(pool);
  app.use('/api/teacher', teacherRoutes);

  // Social routes (includes friends and guilds)
  const socialRoutes = createSocialRoutes();
  app.use('/api/social', socialRoutes);

  // Admin routes (super_admin only - organizations, content, system management)
  const adminRoutes = createAdminRoutes();
  app.use('/api/admin', adminRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        message: 'GLIT Platform API',
        version: '1.0.0',
        environment: envConfig.nodeEnv,
        endpoints: {
          health: '/api/health',
          auth: '/api/auth',
          gamification: '/api/gamification',
          notifications: '/api/notifications',
          teacher: '/api/teacher',
          social: '/api/social',
          admin: '/api/admin',
        },
      },
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

export default createApp;
