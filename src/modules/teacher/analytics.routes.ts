/**
 * Analytics Routes
 *
 * API routes for teacher analytics.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { authenticateJWT } from '../../middleware/auth.middleware';
import {
  requireTeacherRole,
  verifyClassroomOwnership,
  verifyAssignmentOwnership,
  verifyStudentAccess,
} from './teacher.middleware';

export function createAnalyticsRoutes(pool: Pool): Router {
  const router = Router();

  // Initialize repository, service, and controller
  const analyticsRepository = new AnalyticsRepository(pool);
  const analyticsService = new AnalyticsService(analyticsRepository);
  const analyticsController = new AnalyticsController(analyticsService);

  // All routes require authentication and teacher role
  router.use(authenticateJWT, requireTeacherRole);

  /**
   * GET /api/teacher/analytics/classroom/:id
   * Get classroom analytics
   */
  router.get('/classroom/:id', verifyClassroomOwnership(pool), analyticsController.getClassroomAnalytics);

  /**
   * GET /api/teacher/analytics/student/:id
   * Get student performance analytics
   */
  router.get('/student/:id', verifyStudentAccess(pool), analyticsController.getStudentAnalytics);

  /**
   * GET /api/teacher/analytics/assignment/:id
   * Get assignment analytics
   */
  router.get('/assignment/:id', verifyAssignmentOwnership(pool), analyticsController.getAssignmentAnalytics);

  /**
   * GET /api/teacher/analytics/engagement
   * Get engagement metrics
   */
  router.get('/engagement', analyticsController.getEngagementMetrics);

  /**
   * GET /api/teacher/analytics/reports
   * Generate report
   */
  router.get('/reports', analyticsController.generateReport);

  return router;
}
