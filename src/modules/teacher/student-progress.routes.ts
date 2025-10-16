/**
 * Student Progress Routes
 *
 * API routes for student progress tracking and analytics.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { StudentProgressController } from './student-progress.controller';
import { StudentProgressService } from './student-progress.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireTeacherRole } from './teacher.middleware';

export function createStudentProgressRoutes(pool: Pool): Router {
  const router = Router();

  // Initialize service and controller
  const studentProgressService = new StudentProgressService(pool);
  const studentProgressController = new StudentProgressController(studentProgressService);

  // All routes require authentication and teacher role
  router.use(authenticateJWT, requireTeacherRole);

  /**
   * GET /api/teacher/students/:id/progress
   * Get student progress overview
   */
  router.get('/:id/progress', studentProgressController.getStudentProgress);

  /**
   * GET /api/teacher/students/:id/analytics
   * Get detailed student analytics
   */
  router.get('/:id/analytics', studentProgressController.getStudentAnalytics);

  /**
   * GET /api/teacher/students/:id/notes
   * Get teacher notes for student
   */
  router.get('/:id/notes', studentProgressController.getTeacherNotes);

  /**
   * POST /api/teacher/students/:id/note
   * Add teacher note for student
   */
  router.post('/:id/note', studentProgressController.addTeacherNote);

  return router;
}
