/**
 * Classroom Routes
 *
 * API routes for classroom management.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { ClassroomController } from './classroom.controller';
import { ClassroomService } from './classroom.service';
import { ClassroomRepository } from './classroom.repository';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireTeacherRole, verifyClassroomOwnership } from './teacher.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  createClassroomSchema,
  updateClassroomSchema,
  addStudentsSchema,
} from './classroom.validation';

export function createClassroomRoutes(pool: Pool): Router {
  const router = Router();

  // Initialize repository, service, and controller
  const classroomRepository = new ClassroomRepository(pool);
  const classroomService = new ClassroomService(classroomRepository);
  const classroomController = new ClassroomController(classroomService);

  // All routes require authentication and teacher role
  router.use(authenticateJWT, requireTeacherRole);

  /**
   * POST /api/teacher/classrooms
   * Create new classroom
   */
  router.post('/', validate(createClassroomSchema), classroomController.createClassroom);

  /**
   * GET /api/teacher/classrooms
   * Get all classrooms for authenticated teacher
   */
  router.get('/', classroomController.getClassrooms);

  /**
   * GET /api/teacher/classrooms/:id
   * Get classroom details
   */
  router.get('/:id', verifyClassroomOwnership(pool), classroomController.getClassroomById);

  /**
   * PUT /api/teacher/classrooms/:id
   * Update classroom
   */
  router.put(
    '/:id',
    verifyClassroomOwnership(pool),
    validate(updateClassroomSchema),
    classroomController.updateClassroom
  );

  /**
   * DELETE /api/teacher/classrooms/:id
   * Delete classroom
   */
  router.delete('/:id', verifyClassroomOwnership(pool), classroomController.deleteClassroom);

  /**
   * GET /api/teacher/classrooms/:id/students
   * Get students in classroom
   */
  router.get('/:id/students', verifyClassroomOwnership(pool), classroomController.getClassroomStudents);

  /**
   * POST /api/teacher/classrooms/:id/students
   * Add students to classroom (bulk)
   */
  router.post(
    '/:id/students',
    verifyClassroomOwnership(pool),
    validate(addStudentsSchema),
    classroomController.addStudents
  );

  /**
   * DELETE /api/teacher/classrooms/:classId/students/:studentId
   * Remove student from classroom
   */
  router.delete('/:classId/students/:studentId', verifyClassroomOwnership(pool), classroomController.removeStudent);

  return router;
}
