/**
 * Assignment Controller
 *
 * HTTP request handlers for assignment management endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { AssignmentService } from './assignments.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignToDto,
  GradeSubmissionDto,
  PaginationQuery,
} from './teacher.types';

export class AssignmentController {
  constructor(private assignmentService: AssignmentService) {}

  /**
   * POST /api/teacher/assignments
   * Create new assignment
   */
  createAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data: CreateAssignmentDto = req.body;
      const teacherId = req.user!.id;

      const assignment = await this.assignmentService.createAssignment(teacherId, data);

      res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/assignments
   * Get all assignments for authenticated teacher
   */
  getAssignments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.user!.id;

      const pagination: PaginationQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || 'created_at',
        order: (req.query.order as 'asc' | 'desc') || 'desc',
      };

      const result = await this.assignmentService.getTeacherAssignments(teacherId, pagination);

      res.json({
        success: true,
        data: result.assignments,
        meta: {
          total: result.total,
          page: result.page,
          limit: pagination.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/assignments/:id
   * Get assignment details
   */
  getAssignmentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const assignment = await this.assignmentService.getAssignmentById(id);

      res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/teacher/assignments/:id
   * Update assignment
   */
  updateAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: UpdateAssignmentDto = req.body;

      const assignment = await this.assignmentService.updateAssignment(id, data);

      res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/teacher/assignments/:id
   * Delete assignment
   */
  deleteAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await this.assignmentService.deleteAssignment(id);

      res.json({
        success: true,
        data: {
          message: 'Assignment deleted successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/teacher/assignments/:id/assign
   * Assign to classrooms and/or students
   */
  assignTo = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: AssignToDto = req.body;

      const result = await this.assignmentService.assignTo(id, data);

      res.json({
        success: true,
        data: {
          message: 'Assignment assigned successfully',
          assigned: result.assigned,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/assignments/:id/submissions
   * Get assignment submissions
   */
  getSubmissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const submissions = await this.assignmentService.getAssignmentSubmissions(id);

      res.json({
        success: true,
        data: submissions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/teacher/assignments/:assignmentId/submissions/:submissionId/grade
   * Grade submission
   */
  gradeSubmission = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { assignmentId, submissionId } = req.params;
      const data: GradeSubmissionDto = req.body;
      const gradedBy = req.user!.id;

      const submission = await this.assignmentService.gradeSubmission(
        assignmentId,
        submissionId,
        data,
        gradedBy
      );

      res.json({
        success: true,
        data: submission,
      });
    } catch (error) {
      next(error);
    }
  };
}
