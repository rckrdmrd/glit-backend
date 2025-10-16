/**
 * Grading Controller
 *
 * HTTP request handlers for submission grading endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { GradingService } from './grading.service';
import { GradeSubmissionDto, PaginationQuery } from './teacher.types';

export class GradingController {
  constructor(private gradingService: GradingService) {}

  /**
   * GET /api/teacher/submissions/:id
   * Get submission details
   */
  getSubmission = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const teacherId = req.user!.id;

      const submission = await this.gradingService.getSubmissionDetails(id, teacherId);

      res.json({
        success: true,
        data: submission,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/teacher/submissions/:id/grade
   * Submit grade for submission
   */
  gradeSubmission = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: GradeSubmissionDto = req.body;
      const teacherId = req.user!.id;

      const submission = await this.gradingService.gradeSubmission(id, data, teacherId);

      res.json({
        success: true,
        data: submission,
        message: 'Submission graded successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/teacher/submissions/:id/feedback
   * Add feedback to submission
   */
  addFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { feedback } = req.body;
      const teacherId = req.user!.id;

      if (!feedback || typeof feedback !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Feedback text is required',
        });
      }

      const submission = await this.gradingService.addFeedback(id, feedback, teacherId);

      res.json({
        success: true,
        data: submission,
        message: 'Feedback added successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/submissions/pending
   * Get pending submissions for grading
   */
  getPendingSubmissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.user!.id;

      const pagination: PaginationQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || 'submitted_at',
        order: (req.query.order as 'asc' | 'desc') || 'asc',
      };

      const result = await this.gradingService.getPendingSubmissions(teacherId, pagination);

      res.json({
        success: true,
        data: result.submissions,
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
}
