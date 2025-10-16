/**
 * Assignment Routes
 *
 * API routes for assignment management.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AssignmentController } from './assignments.controller';
import { AssignmentService } from './assignments.service';
import { AssignmentRepository } from './assignments.repository';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireTeacherRole, verifyAssignmentOwnership } from './teacher.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  assignToSchema,
  gradeSubmissionSchema,
} from './assignments.validation';

export function createAssignmentRoutes(pool: Pool): Router {
  const router = Router();

  // Initialize repository, service, and controller
  const assignmentRepository = new AssignmentRepository(pool);
  const assignmentService = new AssignmentService(assignmentRepository);
  const assignmentController = new AssignmentController(assignmentService);

  // All routes require authentication and teacher role
  router.use(authenticateJWT, requireTeacherRole);

  /**
   * POST /api/teacher/assignments
   * Create new assignment
   */
  router.post('/', validate(createAssignmentSchema), assignmentController.createAssignment);

  /**
   * GET /api/teacher/assignments
   * Get all assignments for authenticated teacher
   */
  router.get('/', assignmentController.getAssignments);

  /**
   * GET /api/teacher/assignments/:id
   * Get assignment details
   */
  router.get('/:id', verifyAssignmentOwnership(pool), assignmentController.getAssignmentById);

  /**
   * PUT /api/teacher/assignments/:id
   * Update assignment
   */
  router.put(
    '/:id',
    verifyAssignmentOwnership(pool),
    validate(updateAssignmentSchema),
    assignmentController.updateAssignment
  );

  /**
   * DELETE /api/teacher/assignments/:id
   * Delete assignment
   */
  router.delete('/:id', verifyAssignmentOwnership(pool), assignmentController.deleteAssignment);

  /**
   * POST /api/teacher/assignments/:id/assign
   * Assign to classrooms and/or students
   */
  router.post(
    '/:id/assign',
    verifyAssignmentOwnership(pool),
    validate(assignToSchema),
    assignmentController.assignTo
  );

  /**
   * GET /api/teacher/assignments/:id/submissions
   * Get assignment submissions
   */
  router.get('/:id/submissions', verifyAssignmentOwnership(pool), assignmentController.getSubmissions);

  /**
   * POST /api/teacher/assignments/:assignmentId/submissions/:submissionId/grade
   * Grade submission
   */
  router.post(
    '/:assignmentId/submissions/:submissionId/grade',
    verifyAssignmentOwnership(pool),
    validate(gradeSubmissionSchema),
    assignmentController.gradeSubmission
  );

  return router;
}
