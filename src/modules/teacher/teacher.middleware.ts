/**
 * Teacher Authorization Middleware
 *
 * Middleware for verifying teacher permissions and resource ownership.
 */

import { Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AuthRequest, ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';

/**
 * Require Teacher Role Middleware
 *
 * Verifies that user has admin_teacher or super_admin role
 */
export const requireTeacherRole = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      },
    });
    return;
  }

  if (req.user.role !== 'admin_teacher' && req.user.role !== 'super_admin') {
    log.warn(
      `Teacher access denied: User ${req.user.email} with role ${req.user.role} attempted to access teacher endpoint`
    );

    res.status(403).json({
      success: false,
      error: {
        code: ErrorCode.FORBIDDEN,
        message: 'Teacher access required',
        details: {
          requiredRole: 'admin_teacher',
          userRole: req.user.role,
        },
      },
    });
    return;
  }

  next();
};

/**
 * Verify Classroom Ownership Middleware
 *
 * Verifies that the authenticated teacher owns the classroom
 */
export const verifyClassroomOwnership = (pool: Pool) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, classId } = req.params;
      const classroomId = id || classId;

      if (!classroomId) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Classroom ID is required',
          },
        });
        return;
      }

      // Super admin bypass
      if (req.user?.role === 'super_admin') {
        next();
        return;
      }

      // Check classroom ownership
      const result = await pool.query(
        'SELECT teacher_id FROM classrooms WHERE id = $1',
        [classroomId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Classroom not found',
          },
        });
        return;
      }

      if (result.rows[0].teacher_id !== req.user?.id) {
        log.warn(
          `Classroom access denied: User ${req.user?.email} attempted to access classroom owned by ${result.rows[0].teacher_id}`
        );

        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'You do not have permission to access this classroom',
          },
        });
        return;
      }

      next();
    } catch (error) {
      log.error('Error verifying classroom ownership:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to verify classroom ownership',
        },
      });
    }
  };
};

/**
 * Verify Assignment Ownership Middleware
 *
 * Verifies that the authenticated teacher owns the assignment
 */
export const verifyAssignmentOwnership = (pool: Pool) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, assignmentId } = req.params;
      const assignId = id || assignmentId;

      if (!assignId) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Assignment ID is required',
          },
        });
        return;
      }

      // Super admin bypass
      if (req.user?.role === 'super_admin') {
        next();
        return;
      }

      // Check assignment ownership
      const result = await pool.query(
        'SELECT teacher_id FROM assignments WHERE id = $1',
        [assignId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Assignment not found',
          },
        });
        return;
      }

      if (result.rows[0].teacher_id !== req.user?.id) {
        log.warn(
          `Assignment access denied: User ${req.user?.email} attempted to access assignment owned by ${result.rows[0].teacher_id}`
        );

        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'You do not have permission to access this assignment',
          },
        });
        return;
      }

      next();
    } catch (error) {
      log.error('Error verifying assignment ownership:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to verify assignment ownership',
        },
      });
    }
  };
};

/**
 * Verify Student Access Middleware
 *
 * Verifies that the teacher has access to the student (student is in one of teacher's classrooms)
 */
export const verifyStudentAccess = (pool: Pool) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId, id } = req.params;
      const studentIdParam = studentId || id;

      if (!studentIdParam) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Student ID is required',
          },
        });
        return;
      }

      // Super admin bypass
      if (req.user?.role === 'super_admin') {
        next();
        return;
      }

      // Check if student is in any of teacher's classrooms
      const result = await pool.query(
        `SELECT cs.student_id
         FROM classroom_students cs
         JOIN classrooms c ON cs.classroom_id = c.id
         WHERE c.teacher_id = $1 AND cs.student_id = $2
         LIMIT 1`,
        [req.user?.id, studentIdParam]
      );

      if (result.rows.length === 0) {
        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'You do not have access to this student',
          },
        });
        return;
      }

      next();
    } catch (error) {
      log.error('Error verifying student access:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to verify student access',
        },
      });
    }
  };
};
