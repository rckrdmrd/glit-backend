/**
 * Teacher Module
 *
 * Exports routes and types for the teacher module.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { createClassroomRoutes } from './classroom.routes';
import { createAssignmentRoutes } from './assignments.routes';
import { createAnalyticsRoutes } from './analytics.routes';
import { createGradingRoutes } from './grading.routes';
import { createStudentProgressRoutes } from './student-progress.routes';

/**
 * Create Teacher Routes
 *
 * Combines all teacher-related routes:
 * - Classrooms: Create and manage classrooms
 * - Assignments: Create assignments and manage exercises
 * - Grading: Grade submissions and provide feedback
 * - Students: Track student progress and add notes
 * - Analytics: View performance metrics and engagement
 *
 * @param pool - PostgreSQL connection pool
 * @returns Router with all teacher routes
 */
export function createTeacherRoutes(pool: Pool): Router {
  const router = Router();

  // Classroom management routes (7 endpoints)
  router.use('/classrooms', createClassroomRoutes(pool));

  // Assignment management routes (8 endpoints)
  router.use('/assignments', createAssignmentRoutes(pool));

  // Grading routes (4 endpoints)
  router.use('/submissions', createGradingRoutes(pool));

  // Student progress routes (4 endpoints)
  router.use('/students', createStudentProgressRoutes(pool));

  // Analytics routes (5 endpoints)
  router.use('/analytics', createAnalyticsRoutes(pool));

  return router;
}

// Export types
export * from './teacher.types';
