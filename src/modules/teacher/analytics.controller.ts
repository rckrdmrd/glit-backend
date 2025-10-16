/**
 * Analytics Controller
 *
 * HTTP request handlers for teacher analytics endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { AnalyticsService } from './analytics.service';
import { GenerateReportDto } from './teacher.types';

export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * GET /api/teacher/analytics/classroom/:id
   * Get classroom analytics
   */
  getClassroomAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const analytics = await this.analyticsService.getClassroomAnalytics(id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/analytics/student/:id
   * Get student performance analytics
   */
  getStudentAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const analytics = await this.analyticsService.getStudentAnalytics(id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/analytics/assignment/:id
   * Get assignment analytics
   */
  getAssignmentAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const analytics = await this.analyticsService.getAssignmentAnalytics(id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/analytics/engagement
   * Get engagement metrics
   */
  getEngagementMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.user!.id;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const metrics = await this.analyticsService.getEngagementMetrics(teacherId, startDate, endDate);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/analytics/reports
   * Generate report
   */
  generateReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data: GenerateReportDto = {
        report_type: req.query.report_type as 'classroom' | 'student' | 'assignment',
        resource_id: req.query.resource_id as string,
        format: (req.query.format as 'json' | 'csv') || 'json',
        start_date: req.query.start_date as string | undefined,
        end_date: req.query.end_date as string | undefined,
      };

      if (!data.report_type || !data.resource_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'report_type and resource_id are required',
          },
        });
      }

      const report = await this.analyticsService.generateReport(data);

      // If CSV format requested, convert to CSV
      if (data.format === 'csv') {
        // Simple CSV conversion for students
        if (data.report_type === 'classroom') {
          const csv = this.convertClassroomToCSV(report.data);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="classroom_${data.resource_id}_report.csv"`);
          return res.send(csv);
        }
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper: Convert classroom analytics to CSV
   */
  private convertClassroomToCSV(data: any): string {
    const headers = [
      'Student ID',
      'First Name',
      'Last Name',
      'Email',
      'Total Assignments',
      'Completed Assignments',
      'Average Score',
      'ML Coins',
      'Rank',
    ];

    const rows = data.students.map((student: any) => [
      student.student_id,
      student.first_name || '',
      student.last_name || '',
      student.email,
      student.total_assignments,
      student.completed_assignments,
      student.average_score,
      student.ml_coins,
      student.rank,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}
