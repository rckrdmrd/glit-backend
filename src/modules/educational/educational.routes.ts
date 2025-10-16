/**
 * Educational Routes
 * API routes for educational content, exercises, progress, and analytics.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { ModulesController } from './modules.controller';
import { ExercisesController } from './exercises.controller';
import { ProgressController } from './progress.controller';
import { ModulesService } from './modules.service';
import { ExercisesService } from './exercises.service';
import { ProgressService } from './progress.service';
import { AnalyticsService } from './analytics.service';
import { ActivitiesController } from '../progress/activities.controller';
import { ActivitiesService } from '../progress/activities.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { applyRLS } from '../../middleware/rls.middleware';

export function createEducationalRoutes(pool: Pool): Router {
  const router = Router();

  // Initialize services and controllers
  const modulesService = new ModulesService(pool);
  const exercisesService = new ExercisesService(pool);
  const progressService = new ProgressService(pool);
  const analyticsService = new AnalyticsService(pool);
  const activitiesService = new ActivitiesService(pool);

  const modulesController = new ModulesController(modulesService);
  const exercisesController = new ExercisesController(exercisesService);
  const progressController = new ProgressController(progressService);
  const activitiesController = new ActivitiesController(activitiesService);

  // ============================================================================
  // MODULE ROUTES
  // ============================================================================

  // Public routes
  router.get('/modules', modulesController.getAllModules);
  router.get('/modules/:moduleId', modulesController.getModuleById);
  router.get('/modules/:moduleId/exercises', modulesController.getModuleExercises);
  router.get('/modules/:moduleId/access', modulesController.checkModuleAccess);

  // User-specific routes (authentication required)
  router.get('/modules/user/:userId', authenticateJWT, applyRLS, modulesController.getUserModules);

  // Admin routes (authentication required)
  router.post('/modules', authenticateJWT, modulesController.createModule);
  router.put('/modules/:moduleId', authenticateJWT, modulesController.updateModule);
  router.delete('/modules/:moduleId', authenticateJWT, modulesController.deleteModule);
  router.patch('/modules/:moduleId/publish', authenticateJWT, modulesController.updatePublishStatus);

  // ============================================================================
  // EXERCISE ROUTES
  // ============================================================================

  // Public routes
  router.get('/exercises', exercisesController.getAllExercises);
  router.get('/exercises/:exerciseId', exercisesController.getExerciseById);

  // Student routes (authentication required)
  router.post('/exercises/:exerciseId/submit', authenticateJWT, applyRLS, exercisesController.submitExercise);

  // Admin routes (authentication required)
  router.post('/exercises', authenticateJWT, exercisesController.createExercise);
  router.put('/exercises/:exerciseId', authenticateJWT, exercisesController.updateExercise);
  router.delete('/exercises/:exerciseId', authenticateJWT, exercisesController.deleteExercise);

  // ============================================================================
  // PROGRESS ROUTES (authentication required)
  // ============================================================================

  router.get('/progress/user/:userId', authenticateJWT, applyRLS, progressController.getUserProgress);
  router.get('/progress/user/:userId/module/:moduleId', authenticateJWT, applyRLS, progressController.getModuleProgress);
  router.get('/progress/user/:userId/dashboard', authenticateJWT, applyRLS, progressController.getUserDashboard);
  router.get('/progress/attempts/:userId', authenticateJWT, applyRLS, progressController.getExerciseAttempts);

  // Activities routes
  router.get('/progress/activities/:userId', authenticateJWT, applyRLS, activitiesController.getUserActivities);
  router.get('/progress/activities/:userId/stats', authenticateJWT, applyRLS, activitiesController.getActivityStats);
  router.get('/progress/activities/:userId/by-type/:type', authenticateJWT, applyRLS, activitiesController.getUserActivitiesByType);

  // ============================================================================
  // ANALYTICS ROUTES (authentication required)
  // ============================================================================

  router.get('/analytics/:userId', authenticateJWT, applyRLS, async (req, res, next) => {
    try {
      const { userId } = req.params;
      const timeframe = (req.query.timeframe as string) || 'month';

      const analytics = await analyticsService.getUserAnalytics(userId, timeframe);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/analytics/classroom/:classroomId', authenticateJWT, applyRLS, async (req, res, next) => {
    try {
      const { classroomId } = req.params;
      const timeframe = (req.query.timeframe as string) || 'month';

      const analytics = await analyticsService.getClassroomAnalytics(classroomId, timeframe);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
