/**
 * Student Progress Service
 *
 * Business logic for student progress tracking and analytics.
 */

import { Pool } from 'pg';
import { log } from '../../shared/utils/logger';

interface StudentProgress {
  studentId: string;
  studentName: string;
  studentEmail: string;
  completedExercises: number;
  totalExercises: number;
  averageScore: number;
  totalTimeSpent: number;
  currentStreak: number;
  lastActive: Date | null;
  strugglingAreas: string[];
  assignments: {
    total: number;
    completed: number;
    pending: number;
    averageScore: number;
  };
}

interface StudentAnalytics {
  studentId: string;
  studentName: string;
  studentEmail: string;
  overallStats: {
    totalExercises: number;
    completedExercises: number;
    averageScore: number;
    totalCoins: number;
    currentRank: string;
    streakDays: number;
  };
  modulePerformance: any[];
  recentActivity: any[];
  assignmentHistory: any[];
}

interface TeacherNote {
  id: string;
  teacherId: string;
  studentId: string;
  note: string;
  isPrivate: boolean;
  createdAt: Date;
}

export class StudentProgressService {
  constructor(private pool: Pool) {}

  /**
   * Verify teacher has access to student
   * (Student must be in one of teacher's classrooms)
   */
  private async verifyTeacherStudentAccess(studentId: string, teacherId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM classroom_students cs
        JOIN classrooms c ON cs.classroom_id = c.id
        WHERE cs.student_id = $1 AND c.teacher_id = $2
      ) as has_access
    `;

    const result = await this.pool.query(query, [studentId, teacherId]);
    return result.rows[0]?.has_access || false;
  }

  /**
   * Get student progress overview
   */
  async getStudentProgress(studentId: string, teacherId: string): Promise<StudentProgress> {
    log.info(`Getting progress for student ${studentId} by teacher ${teacherId}`);

    // Verify access
    const hasAccess = await this.verifyTeacherStudentAccess(studentId, teacherId);
    if (!hasAccess) {
      throw new Error('Access denied: Student not in your classrooms');
    }

    // Get student info
    const studentQuery = `
      SELECT u.id, u.email, p.first_name, p.last_name, p.display_name
      FROM auth.users u
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `;
    const studentResult = await this.pool.query(studentQuery, [studentId]);
    const student = studentResult.rows[0];

    if (!student) {
      throw new Error('Student not found');
    }

    // Get exercise progress
    const exerciseQuery = `
      SELECT
        COUNT(DISTINCT ep.exercise_id) as completed_exercises,
        COUNT(DISTINCT e.id) as total_exercises,
        COALESCE(AVG(ep.score), 0) as average_score,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ep.completed_at - ep.started_at))/60), 0) as total_time_minutes
      FROM exercise_progress ep
      RIGHT JOIN exercises e ON ep.exercise_id = e.id
      WHERE ep.user_id = $1 OR ep.user_id IS NULL
    `;
    const exerciseResult = await this.pool.query(exerciseQuery, [studentId]);
    const exerciseStats = exerciseResult.rows[0];

    // Get assignment stats
    const assignmentQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'graded')) as completed,
        COUNT(*) FILTER (WHERE status IN ('not_started', 'in_progress')) as pending,
        COALESCE(AVG(score), 0) as average_score
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      WHERE asub.student_id = $1 AND a.teacher_id = $2
    `;
    const assignmentResult = await this.pool.query(assignmentQuery, [studentId, teacherId]);
    const assignmentStats = assignmentResult.rows[0];

    // Get streak (simplified - would need more complex logic for actual streaks)
    const streakQuery = `
      SELECT
        MAX(completed_at) as last_active,
        COUNT(DISTINCT DATE(completed_at)) as active_days
      FROM exercise_progress
      WHERE user_id = $1
      AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
    `;
    const streakResult = await this.pool.query(streakQuery, [studentId]);
    const streakData = streakResult.rows[0];

    // Get struggling areas (topics with low scores)
    const strugglingQuery = `
      SELECT DISTINCT e.topic
      FROM exercise_progress ep
      JOIN exercises e ON ep.exercise_id = e.id
      WHERE ep.user_id = $1
      GROUP BY e.topic
      HAVING AVG(ep.score) < 60
      ORDER BY AVG(ep.score) ASC
      LIMIT 5
    `;
    const strugglingResult = await this.pool.query(strugglingQuery, [studentId]);
    const strugglingAreas = strugglingResult.rows.map((row) => row.topic);

    return {
      studentId: student.id,
      studentName: student.display_name || `${student.first_name} ${student.last_name}`,
      studentEmail: student.email,
      completedExercises: parseInt(exerciseStats.completed_exercises) || 0,
      totalExercises: parseInt(exerciseStats.total_exercises) || 0,
      averageScore: parseFloat(exerciseStats.average_score) || 0,
      totalTimeSpent: parseFloat(exerciseStats.total_time_minutes) || 0,
      currentStreak: parseInt(streakData.active_days) || 0,
      lastActive: streakData.last_active,
      strugglingAreas,
      assignments: {
        total: parseInt(assignmentStats.total) || 0,
        completed: parseInt(assignmentStats.completed) || 0,
        pending: parseInt(assignmentStats.pending) || 0,
        averageScore: parseFloat(assignmentStats.average_score) || 0,
      },
    };
  }

  /**
   * Get detailed student analytics
   */
  async getStudentAnalytics(studentId: string, teacherId: string): Promise<StudentAnalytics> {
    log.info(`Getting analytics for student ${studentId} by teacher ${teacherId}`);

    // Verify access
    const hasAccess = await this.verifyTeacherStudentAccess(studentId, teacherId);
    if (!hasAccess) {
      throw new Error('Access denied: Student not in your classrooms');
    }

    // Get student info
    const studentQuery = `
      SELECT
        u.id, u.email,
        p.first_name, p.last_name, p.display_name,
        g.ml_coins, g.current_streak,
        r.name as rank_name
      FROM auth.users u
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      LEFT JOIN gamification g ON u.id = g.user_id
      LEFT JOIN ranks r ON g.rank_id = r.id
      WHERE u.id = $1
    `;
    const studentResult = await this.pool.query(studentQuery, [studentId]);
    const student = studentResult.rows[0];

    if (!student) {
      throw new Error('Student not found');
    }

    // Get overall stats
    const overallQuery = `
      SELECT
        COUNT(DISTINCT ep.exercise_id) as total_exercises,
        COUNT(DISTINCT CASE WHEN ep.completed_at IS NOT NULL THEN ep.exercise_id END) as completed_exercises,
        COALESCE(AVG(ep.score), 0) as average_score
      FROM exercise_progress ep
      WHERE ep.user_id = $1
    `;
    const overallResult = await this.pool.query(overallQuery, [studentId]);
    const overallStats = overallResult.rows[0];

    // Get module performance
    const moduleQuery = `
      SELECT
        m.id as module_id,
        m.name as module_name,
        COUNT(ep.id) as exercises_attempted,
        COUNT(ep.id) FILTER (WHERE ep.completed_at IS NOT NULL) as exercises_completed,
        COALESCE(AVG(ep.score), 0) as average_score,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ep.completed_at - ep.started_at))/60), 0) as time_spent_minutes
      FROM modules m
      LEFT JOIN exercises e ON m.id = e.module_id
      LEFT JOIN exercise_progress ep ON e.id = ep.exercise_id AND ep.user_id = $1
      GROUP BY m.id, m.name
      ORDER BY m.order_index
    `;
    const moduleResult = await this.pool.query(moduleQuery, [studentId]);

    // Get recent activity
    const activityQuery = `
      SELECT
        ep.exercise_id,
        e.title as exercise_title,
        m.name as module_name,
        ep.score,
        ep.completed_at,
        ep.attempts
      FROM exercise_progress ep
      JOIN exercises e ON ep.exercise_id = e.id
      JOIN modules m ON e.module_id = m.id
      WHERE ep.user_id = $1 AND ep.completed_at IS NOT NULL
      ORDER BY ep.completed_at DESC
      LIMIT 10
    `;
    const activityResult = await this.pool.query(activityQuery, [studentId]);

    // Get assignment history
    const assignmentHistoryQuery = `
      SELECT
        a.id as assignment_id,
        a.title as assignment_title,
        a.assignment_type,
        asub.status,
        asub.score,
        a.total_points as max_score,
        asub.submitted_at,
        asub.graded_at,
        asub.feedback
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      WHERE asub.student_id = $1 AND a.teacher_id = $2
      ORDER BY asub.created_at DESC
      LIMIT 20
    `;
    const assignmentHistoryResult = await this.pool.query(assignmentHistoryQuery, [studentId, teacherId]);

    return {
      studentId: student.id,
      studentName: student.display_name || `${student.first_name} ${student.last_name}`,
      studentEmail: student.email,
      overallStats: {
        totalExercises: parseInt(overallStats.total_exercises) || 0,
        completedExercises: parseInt(overallStats.completed_exercises) || 0,
        averageScore: parseFloat(overallStats.average_score) || 0,
        totalCoins: student.ml_coins || 0,
        currentRank: student.rank_name || 'Novice',
        streakDays: student.current_streak || 0,
      },
      modulePerformance: moduleResult.rows,
      recentActivity: activityResult.rows,
      assignmentHistory: assignmentHistoryResult.rows,
    };
  }

  /**
   * Add teacher note for student
   */
  async addTeacherNote(
    studentId: string,
    teacherId: string,
    note: string,
    isPrivate: boolean = true
  ): Promise<TeacherNote> {
    log.info(`Adding teacher note for student ${studentId} by teacher ${teacherId}`);

    // Verify access
    const hasAccess = await this.verifyTeacherStudentAccess(studentId, teacherId);
    if (!hasAccess) {
      throw new Error('Access denied: Student not in your classrooms');
    }

    const query = `
      INSERT INTO teacher_notes (teacher_id, student_id, note, is_private)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await this.pool.query(query, [teacherId, studentId, note, isPrivate]);
    return result.rows[0];
  }

  /**
   * Get teacher notes for student
   */
  async getTeacherNotes(studentId: string, teacherId: string): Promise<TeacherNote[]> {
    log.info(`Getting teacher notes for student ${studentId} by teacher ${teacherId}`);

    // Verify access
    const hasAccess = await this.verifyTeacherStudentAccess(studentId, teacherId);
    if (!hasAccess) {
      throw new Error('Access denied: Student not in your classrooms');
    }

    const query = `
      SELECT
        tn.*,
        u.email as teacher_email,
        p.first_name as teacher_first_name,
        p.last_name as teacher_last_name
      FROM teacher_notes tn
      JOIN auth.users u ON tn.teacher_id = u.id
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      WHERE tn.student_id = $1 AND tn.teacher_id = $2
      ORDER BY tn.created_at DESC
    `;

    const result = await this.pool.query(query, [studentId, teacherId]);
    return result.rows;
  }
}
