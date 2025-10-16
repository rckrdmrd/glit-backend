/**
 * Teacher Notifications Helper
 *
 * Integration with the notification system for teacher-related events.
 * This module provides functions to send notifications to students when:
 * - New assignments are created
 * - Assignments are graded
 * - Feedback is added
 * - Due dates are approaching
 */

import { Pool } from 'pg';
import { log } from '../../shared/utils/logger';

export interface AssignmentNotification {
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  dueDate?: Date;
  teacherName: string;
}

export interface GradeNotification {
  assignmentTitle: string;
  score: number;
  maxScore: number;
  letterGrade: string;
  feedback?: string;
}

export interface FeedbackNotification {
  assignmentTitle: string;
  feedback: string;
}

/**
 * Teacher Notification Service
 */
export class TeacherNotificationService {
  constructor(private pool: Pool) {}

  /**
   * Notify students about new assignment
   */
  async notifyNewAssignment(
    studentIds: string[],
    assignmentData: AssignmentNotification
  ): Promise<void> {
    log.info(`Notifying ${studentIds.length} students about new assignment: ${assignmentData.assignmentTitle}`);

    try {
      // Create notifications for each student
      const notifications = studentIds.map((studentId) => ({
        user_id: studentId,
        type: 'assignment_created',
        title: 'New Assignment',
        message: `New ${assignmentData.assignmentType} assignment: "${assignmentData.assignmentTitle}"${
          assignmentData.dueDate ? ` - Due ${new Date(assignmentData.dueDate).toLocaleDateString()}` : ''
        }`,
        data: {
          assignment_id: assignmentData.assignmentId,
          assignment_title: assignmentData.assignmentTitle,
          assignment_type: assignmentData.assignmentType,
          due_date: assignmentData.dueDate,
          teacher_name: assignmentData.teacherName,
        },
        is_read: false,
      }));

      // Batch insert notifications
      if (notifications.length > 0) {
        const query = `
          INSERT INTO notifications (user_id, type, title, message, data, is_read)
          VALUES ${notifications.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
        `;

        const values = notifications.flatMap((n) => [
          n.user_id,
          n.type,
          n.title,
          n.message,
          JSON.stringify(n.data),
          n.is_read,
        ]);

        await this.pool.query(query, values);
        log.info(`Created ${notifications.length} assignment notifications`);
      }
    } catch (error) {
      log.error('Error sending assignment notifications:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Notify student about graded assignment
   */
  async notifyAssignmentGraded(
    studentId: string,
    gradeData: GradeNotification
  ): Promise<void> {
    log.info(`Notifying student ${studentId} about graded assignment: ${gradeData.assignmentTitle}`);

    try {
      const percentage = Math.round((gradeData.score / gradeData.maxScore) * 100);
      const message = `Your assignment "${gradeData.assignmentTitle}" has been graded: ${gradeData.score}/${gradeData.maxScore} (${percentage}% - ${gradeData.letterGrade})`;

      const query = `
        INSERT INTO notifications (user_id, type, title, message, data, is_read)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await this.pool.query(query, [
        studentId,
        'assignment_graded',
        'Assignment Graded',
        message,
        JSON.stringify({
          assignment_title: gradeData.assignmentTitle,
          score: gradeData.score,
          max_score: gradeData.maxScore,
          letter_grade: gradeData.letterGrade,
          percentage,
          has_feedback: !!gradeData.feedback,
        }),
        false,
      ]);

      log.info(`Created grade notification for student ${studentId}`);
    } catch (error) {
      log.error('Error sending grade notification:', error);
    }
  }

  /**
   * Notify student about feedback added
   */
  async notifyFeedbackAdded(
    studentId: string,
    feedbackData: FeedbackNotification
  ): Promise<void> {
    log.info(`Notifying student ${studentId} about feedback on: ${feedbackData.assignmentTitle}`);

    try {
      const message = `Your teacher added feedback to "${feedbackData.assignmentTitle}"`;

      const query = `
        INSERT INTO notifications (user_id, type, title, message, data, is_read)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await this.pool.query(query, [
        studentId,
        'feedback_added',
        'New Feedback',
        message,
        JSON.stringify({
          assignment_title: feedbackData.assignmentTitle,
          feedback_preview: feedbackData.feedback.substring(0, 100),
        }),
        false,
      ]);

      log.info(`Created feedback notification for student ${studentId}`);
    } catch (error) {
      log.error('Error sending feedback notification:', error);
    }
  }

  /**
   * Notify students about approaching due date
   */
  async notifyDueDateApproaching(
    studentIds: string[],
    assignmentTitle: string,
    dueDate: Date,
    hoursRemaining: number
  ): Promise<void> {
    log.info(`Notifying ${studentIds.length} students about due date for: ${assignmentTitle}`);

    try {
      const message = `Assignment "${assignmentTitle}" is due in ${hoursRemaining} hours (${dueDate.toLocaleString()})`;

      const notifications = studentIds.map((studentId) => ({
        user_id: studentId,
        type: 'due_date_reminder',
        title: 'Assignment Due Soon',
        message,
        data: {
          assignment_title: assignmentTitle,
          due_date: dueDate,
          hours_remaining: hoursRemaining,
        },
        is_read: false,
      }));

      if (notifications.length > 0) {
        const query = `
          INSERT INTO notifications (user_id, type, title, message, data, is_read)
          VALUES ${notifications.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
        `;

        const values = notifications.flatMap((n) => [
          n.user_id,
          n.type,
          n.title,
          n.message,
          JSON.stringify(n.data),
          n.is_read,
        ]);

        await this.pool.query(query, values);
        log.info(`Created ${notifications.length} due date reminder notifications`);
      }
    } catch (error) {
      log.error('Error sending due date notifications:', error);
    }
  }

  /**
   * Get students who need to be notified for a classroom
   */
  async getClassroomStudentIds(classroomId: string): Promise<string[]> {
    const query = `
      SELECT student_id FROM classroom_students WHERE classroom_id = $1
    `;

    const result = await this.pool.query(query, [classroomId]);
    return result.rows.map((row) => row.student_id);
  }

  /**
   * Get students who need to be notified for an assignment
   */
  async getAssignmentStudentIds(assignmentId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT student_id FROM (
        -- Students from assigned classrooms
        SELECT cs.student_id
        FROM assignment_classrooms ac
        JOIN classroom_students cs ON ac.classroom_id = cs.classroom_id
        WHERE ac.assignment_id = $1

        UNION

        -- Individual students assigned
        SELECT student_id
        FROM assignment_students
        WHERE assignment_id = $1
      ) AS combined_students
    `;

    const result = await this.pool.query(query, [assignmentId]);
    return result.rows.map((row) => row.student_id);
  }
}

/**
 * Create notification service instance
 */
export function createNotificationService(pool: Pool): TeacherNotificationService {
  return new TeacherNotificationService(pool);
}
