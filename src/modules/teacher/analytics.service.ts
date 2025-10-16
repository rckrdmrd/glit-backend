/**
 * Analytics Service
 *
 * Business logic for teacher analytics.
 */

import { AnalyticsRepository } from './analytics.repository';
import {
  ClassroomAnalytics,
  StudentAnalytics,
  AssignmentAnalytics,
  EngagementMetrics,
  GenerateReportDto,
} from './teacher.types';
import { log } from '../../shared/utils/logger';

export class AnalyticsService {
  constructor(private analyticsRepository: AnalyticsRepository) {}

  /**
   * Get classroom analytics
   */
  async getClassroomAnalytics(classroomId: string): Promise<ClassroomAnalytics> {
    log.info(`Getting analytics for classroom ${classroomId}`);
    return await this.analyticsRepository.getClassroomAnalytics(classroomId);
  }

  /**
   * Get student analytics
   */
  async getStudentAnalytics(studentId: string): Promise<StudentAnalytics> {
    log.info(`Getting analytics for student ${studentId}`);
    return await this.analyticsRepository.getStudentAnalytics(studentId);
  }

  /**
   * Get assignment analytics
   */
  async getAssignmentAnalytics(assignmentId: string): Promise<AssignmentAnalytics> {
    log.info(`Getting analytics for assignment ${assignmentId}`);
    return await this.analyticsRepository.getAssignmentAnalytics(assignmentId);
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(
    teacherId: string,
    startDate?: string,
    endDate?: string
  ): Promise<EngagementMetrics> {
    log.info(`Getting engagement metrics for teacher ${teacherId}`);
    return await this.analyticsRepository.getEngagementMetrics(teacherId, startDate, endDate);
  }

  /**
   * Generate report
   */
  async generateReport(data: GenerateReportDto): Promise<any> {
    log.info(`Generating ${data.report_type} report for ${data.resource_id}`);

    let reportData: any;

    switch (data.report_type) {
      case 'classroom':
        reportData = await this.analyticsRepository.getClassroomAnalytics(data.resource_id);
        break;

      case 'student':
        reportData = await this.analyticsRepository.getStudentAnalytics(data.resource_id);
        break;

      case 'assignment':
        reportData = await this.analyticsRepository.getAssignmentAnalytics(data.resource_id);
        break;

      default:
        throw new Error(`Invalid report type: ${data.report_type}`);
    }

    // Return in requested format
    return {
      report_type: data.report_type,
      resource_id: data.resource_id,
      generated_at: new Date().toISOString(),
      format: data.format || 'json',
      data: reportData,
    };
  }
}
