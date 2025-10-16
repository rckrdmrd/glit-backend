/**
 * Grading Service
 *
 * Business logic for submission grading operations.
 */

import { Pool } from 'pg';
import { GradeSubmissionDto, PaginationQuery, AssignmentSubmission } from './teacher.types';
import { log } from '../../shared/utils/logger';

/**
 * Calculate letter grade from numerical score
 */
export function calculateLetterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Validate grade range
 */
function validateGrade(score: number, maxScore: number = 100): void {
  if (score < 0 || score > maxScore) {
    throw new Error(`Score must be between 0 and ${maxScore}`);
  }
}

export class GradingService {
  constructor(private pool: Pool) {}

  /**
   * Get submission details with authorization check
   */
  async getSubmissionDetails(submissionId: string, teacherId: string): Promise<any> {
    log.info(`Getting submission ${submissionId} for teacher ${teacherId}`);

    const query = `
      SELECT
        asub.*,
        a.title as assignment_title,
        a.teacher_id,
        a.total_points as assignment_max_score,
        u.email as student_email,
        p.first_name as student_first_name,
        p.last_name as student_last_name,
        p.display_name as student_display_name,
        grader.email as graded_by_email,
        grader_profile.first_name as grader_first_name,
        grader_profile.last_name as grader_last_name
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      JOIN auth.users u ON asub.student_id = u.id
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      LEFT JOIN auth.users grader ON asub.graded_by = grader.id
      LEFT JOIN auth_management.profiles grader_profile ON grader.id = grader_profile.user_id
      WHERE asub.id = $1 AND a.teacher_id = $2
    `;

    const result = await this.pool.query(query, [submissionId, teacherId]);

    if (result.rows.length === 0) {
      throw new Error('Submission not found or access denied');
    }

    return result.rows[0];
  }

  /**
   * Grade submission with validation and notifications
   */
  async gradeSubmission(
    submissionId: string,
    data: GradeSubmissionDto,
    teacherId: string
  ): Promise<AssignmentSubmission> {
    log.info(`Grading submission ${submissionId} by teacher ${teacherId}`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get submission and verify ownership
      const submission = await this.getSubmissionDetails(submissionId, teacherId);

      if (!submission) {
        throw new Error('Submission not found or access denied');
      }

      if (submission.status !== 'submitted') {
        throw new Error('Can only grade submitted assignments');
      }

      // Validate grade
      validateGrade(data.score, submission.assignment_max_score);

      // Calculate letter grade
      const percentage = (data.score / submission.assignment_max_score) * 100;
      const letterGrade = calculateLetterGrade(percentage);

      // Update submission
      const updateQuery = `
        UPDATE assignment_submissions
        SET
          score = $1,
          feedback = $2,
          status = 'graded',
          graded_at = CURRENT_TIMESTAMP,
          graded_by = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        data.score,
        data.feedback || null,
        teacherId,
        submissionId,
      ]);

      const gradedSubmission = updateResult.rows[0];

      // TODO: Send notification to student
      // await notificationService.notifyStudentGraded(submission.student_id, {
      //   assignmentTitle: submission.assignment_title,
      //   score: data.score,
      //   maxScore: submission.assignment_max_score,
      //   letterGrade,
      //   feedback: data.feedback,
      // });

      await client.query('COMMIT');

      log.info(`Submission ${submissionId} graded: ${data.score}/${submission.assignment_max_score} (${letterGrade})`);

      return {
        ...gradedSubmission,
        letter_grade: letterGrade,
        percentage,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error grading submission:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add feedback to submission
   */
  async addFeedback(submissionId: string, feedback: string, teacherId: string): Promise<AssignmentSubmission> {
    log.info(`Adding feedback to submission ${submissionId}`);

    // Verify ownership
    const submission = await this.getSubmissionDetails(submissionId, teacherId);

    if (!submission) {
      throw new Error('Submission not found or access denied');
    }

    const query = `
      UPDATE assignment_submissions
      SET
        feedback = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [feedback, submissionId]);

    // TODO: Send notification to student if submission is graded
    // if (submission.status === 'graded') {
    //   await notificationService.notifyFeedbackAdded(submission.student_id, {
    //     assignmentTitle: submission.assignment_title,
    //     feedback,
    //   });
    // }

    return result.rows[0];
  }

  /**
   * Get pending submissions for teacher
   */
  async getPendingSubmissions(
    teacherId: string,
    pagination: PaginationQuery
  ): Promise<{ submissions: any[]; total: number; page: number; totalPages: number }> {
    log.info(`Getting pending submissions for teacher ${teacherId}`);

    const offset = (pagination.page - 1) * pagination.limit;
    const orderBy = pagination.sortBy || 'submitted_at';
    const order = pagination.order || 'asc';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      WHERE a.teacher_id = $1 AND asub.status = 'submitted'
    `;
    const countResult = await this.pool.query(countQuery, [teacherId]);
    const total = parseInt(countResult.rows[0].count);

    // Get submissions
    const query = `
      SELECT
        asub.*,
        a.title as assignment_title,
        a.total_points as assignment_max_score,
        a.assignment_type,
        u.email as student_email,
        p.first_name as student_first_name,
        p.last_name as student_last_name,
        p.display_name as student_display_name,
        p.avatar_url as student_avatar_url
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      JOIN auth.users u ON asub.student_id = u.id
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      WHERE a.teacher_id = $1 AND asub.status = 'submitted'
      ORDER BY ${orderBy} ${order}
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [teacherId, pagination.limit, offset]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      submissions: result.rows,
      total,
      page: pagination.page,
      totalPages,
    };
  }

  /**
   * Identify struggling areas based on submissions
   * Analyzes patterns in wrong answers to identify topics needing attention
   */
  async identifyStrugglingAreas(studentId: string, assignmentId?: string): Promise<string[]> {
    log.info(`Identifying struggling areas for student ${studentId}`);

    // This is a placeholder for more sophisticated analysis
    // In a real implementation, you would:
    // 1. Analyze exercise types and topics
    // 2. Identify patterns in incorrect answers
    // 3. Track time spent on different topics
    // 4. Compare performance across similar exercises

    const query = `
      SELECT
        e.topic,
        e.difficulty,
        COUNT(*) as attempts,
        AVG(ep.score) as avg_score
      FROM exercise_progress ep
      JOIN exercises e ON ep.exercise_id = e.id
      WHERE ep.user_id = $1
      ${assignmentId ? 'AND ep.assignment_id = $2' : ''}
      GROUP BY e.topic, e.difficulty
      HAVING AVG(ep.score) < 60
      ORDER BY AVG(ep.score) ASC
      LIMIT 5
    `;

    const params = assignmentId ? [studentId, assignmentId] : [studentId];
    const result = await this.pool.query(query, params);

    return result.rows.map((row) => `${row.topic} (${row.difficulty})`);
  }
}
