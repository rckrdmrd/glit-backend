/**
 * Grading Routes
 *
 * API routes for grading submissions.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireTeacherRole } from './teacher.middleware';
import { validate } from '../../middleware/validation.middleware';
import { gradeSubmissionSchema } from './assignments.validation';

export function createGradingRoutes(pool: Pool): Router {
  const router = Router();

  // Initialize service and controller
  const gradingService = new GradingService(pool);
  const gradingController = new GradingController(gradingService);

  // All routes require authentication and teacher role
  router.use(authenticateJWT, requireTeacherRole);

  /**
   * GET /api/teacher/submissions/pending
   * Get pending submissions for grading
   * Note: This must come BEFORE /:id route to avoid route conflicts
   */
  router.get('/pending', gradingController.getPendingSubmissions);

  /**
   * GET /api/teacher/submissions/:id
   * Get submission details
   */
  router.get('/:id', gradingController.getSubmission);

  /**
   * POST /api/teacher/submissions/:id/grade
   * Submit grade for submission
   */
  router.post('/:id/grade', validate(gradeSubmissionSchema), gradingController.gradeSubmission);

  /**
   * POST /api/teacher/submissions/:id/feedback
   * Add feedback to submission
   */
  router.post('/:id/feedback', gradingController.addFeedback);

  return router;
}
