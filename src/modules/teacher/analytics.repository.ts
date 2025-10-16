/**
 * Analytics Repository
 *
 * Database operations for teacher analytics.
 */

import { Pool } from 'pg';
import {
  ClassroomAnalytics,
  StudentAnalytics,
  AssignmentAnalytics,
  EngagementMetrics,
  ModulePerformance,
  RecentActivity,
} from './teacher.types';

export class AnalyticsRepository {
  constructor(private pool: Pool) {}

  /**
   * Get classroom analytics
   */
  async getClassroomAnalytics(classroomId: string): Promise<ClassroomAnalytics> {
    // Get classroom info
    const classroomQuery = `
      SELECT id, name FROM classrooms WHERE id = $1
    `;
    const classroomResult = await this.pool.query(classroomQuery, [classroomId]);
    const classroom = classroomResult.rows[0];

    // Get student performance
    const studentsQuery = `
      SELECT
        u.id as student_id,
        p.first_name,
        p.last_name,
        u.email,
        COUNT(DISTINCT asub.id) FILTER (WHERE asub.status = 'submitted' OR asub.status = 'graded') as completed_assignments,
        COUNT(DISTINCT asub.id) as total_assignments,
        COALESCE(AVG(asub.score), 0) as average_score,
        COALESCE(us.ml_coins, 0) as ml_coins,
        COALESCE(us.current_rank, 'nacom') as rank,
        MAX(ep.created_at) as last_activity
      FROM classroom_students cs
      JOIN auth.users u ON cs.student_id = u.id
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      LEFT JOIN assignment_submissions asub ON u.id = asub.student_id
      LEFT JOIN gamification_system.user_stats us ON u.id = us.user_id
      LEFT JOIN exercise_progress ep ON u.id = ep.user_id
      WHERE cs.classroom_id = $1
      GROUP BY u.id, p.first_name, p.last_name, u.email, us.ml_coins, us.current_rank
      ORDER BY p.last_name, p.first_name
    `;
    const studentsResult = await this.pool.query(studentsQuery, [classroomId]);

    const totalStudents = studentsResult.rows.length;
    const activeStudents = studentsResult.rows.filter(
      (s) => s.last_activity && new Date(s.last_activity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    const averageScore =
      totalStudents > 0
        ? studentsResult.rows.reduce((sum, s) => sum + parseFloat(s.average_score), 0) / totalStudents
        : 0;

    // Get total assignments for classroom
    const assignmentsQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM assignments a
      JOIN assignment_classrooms ac ON a.id = ac.assignment_id
      WHERE ac.classroom_id = $1
    `;
    const assignmentsResult = await this.pool.query(assignmentsQuery, [classroomId]);
    const totalAssignments = parseInt(assignmentsResult.rows[0].total);

    // Calculate completion rate
    const completionRate =
      totalStudents > 0 && totalAssignments > 0
        ? studentsResult.rows.reduce((sum, s) => sum + parseInt(s.completed_assignments), 0) /
          (totalStudents * totalAssignments)
        : 0;

    return {
      classroom_id: classroom.id,
      classroom_name: classroom.name,
      total_students: totalStudents,
      active_students: activeStudents,
      average_score: Math.round(averageScore * 100) / 100,
      total_assignments: totalAssignments,
      completion_rate: Math.round(completionRate * 100),
      students: studentsResult.rows.map((row) => ({
        student_id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        total_assignments: parseInt(row.total_assignments),
        completed_assignments: parseInt(row.completed_assignments),
        average_score: Math.round(parseFloat(row.average_score) * 100) / 100,
        ml_coins: parseInt(row.ml_coins),
        rank: row.rank,
        last_activity: row.last_activity,
      })),
    };
  }

  /**
   * Get student analytics
   */
  async getStudentAnalytics(studentId: string): Promise<StudentAnalytics> {
    // Get student info
    const studentQuery = `
      SELECT
        u.id,
        COALESCE(p.display_name, p.first_name || ' ' || p.last_name, u.email) as name
      FROM auth.users u
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `;
    const studentResult = await this.pool.query(studentQuery, [studentId]);
    const student = studentResult.rows[0];

    // Get overall stats
    const statsQuery = `
      SELECT
        COUNT(DISTINCT ep.exercise_id) FILTER (WHERE ep.status = 'started') as total_exercises,
        COUNT(DISTINCT ep.exercise_id) FILTER (WHERE ep.status = 'completed') as completed_exercises,
        COALESCE(AVG(ep.score), 0) as average_score,
        COALESCE(SUM(ep.ml_coins_earned), 0) as total_coins,
        COALESCE(us.current_rank, 'nacom') as current_rank,
        COALESCE(us.streak_days, 0) as streak_days
      FROM exercise_progress ep
      LEFT JOIN gamification_system.user_stats us ON ep.user_id = us.user_id
      WHERE ep.user_id = $1
      GROUP BY us.current_rank, us.streak_days
    `;
    const statsResult = await this.pool.query(statsQuery, [studentId]);
    const stats = statsResult.rows[0] || {
      total_exercises: 0,
      completed_exercises: 0,
      average_score: 0,
      total_coins: 0,
      current_rank: 'nacom',
      streak_days: 0,
    };

    // Get module performance
    const moduleQuery = `
      SELECT
        m.id as module_id,
        m.name as module_name,
        COUNT(DISTINCT ep.exercise_id) FILTER (WHERE ep.status IN ('started', 'completed')) as exercises_attempted,
        COUNT(DISTINCT ep.exercise_id) FILTER (WHERE ep.status = 'completed') as exercises_completed,
        COALESCE(AVG(ep.score), 0) as average_score,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ep.completed_at - ep.started_at)) / 60), 0) as time_spent_minutes
      FROM exercise_progress ep
      JOIN exercises e ON ep.exercise_id = e.id
      JOIN modules m ON e.module_id = m.id
      WHERE ep.user_id = $1
      GROUP BY m.id, m.name
      ORDER BY m.name
    `;
    const moduleResult = await this.pool.query(moduleQuery, [studentId]);

    // Get recent activity
    const activityQuery = `
      SELECT
        e.id as exercise_id,
        e.title as exercise_title,
        m.name as module_name,
        ep.score,
        ep.completed_at,
        ep.attempt_count as attempts
      FROM exercise_progress ep
      JOIN exercises e ON ep.exercise_id = e.id
      JOIN modules m ON e.module_id = m.id
      WHERE ep.user_id = $1 AND ep.status = 'completed'
      ORDER BY ep.completed_at DESC
      LIMIT 20
    `;
    const activityResult = await this.pool.query(activityQuery, [studentId]);

    return {
      student_id: student.id,
      student_name: student.name,
      overall_stats: {
        total_exercises: parseInt(stats.total_exercises),
        completed_exercises: parseInt(stats.completed_exercises),
        average_score: Math.round(parseFloat(stats.average_score) * 100) / 100,
        total_coins: parseInt(stats.total_coins),
        current_rank: stats.current_rank,
        streak_days: parseInt(stats.streak_days),
      },
      module_performance: moduleResult.rows.map((row) => ({
        module_id: row.module_id,
        module_name: row.module_name,
        exercises_attempted: parseInt(row.exercises_attempted),
        exercises_completed: parseInt(row.exercises_completed),
        average_score: Math.round(parseFloat(row.average_score) * 100) / 100,
        time_spent_minutes: Math.round(parseFloat(row.time_spent_minutes)),
      })),
      recent_activity: activityResult.rows.map((row) => ({
        exercise_id: row.exercise_id,
        exercise_title: row.exercise_title,
        module_name: row.module_name,
        score: parseFloat(row.score),
        completed_at: row.completed_at,
        attempts: parseInt(row.attempts),
      })),
    };
  }

  /**
   * Get assignment analytics
   */
  async getAssignmentAnalytics(assignmentId: string): Promise<AssignmentAnalytics> {
    // Get assignment info
    const assignmentQuery = `
      SELECT id, title FROM assignments WHERE id = $1
    `;
    const assignmentResult = await this.pool.query(assignmentQuery, [assignmentId]);
    const assignment = assignmentResult.rows[0];

    // Get submission details
    const submissionsQuery = `
      SELECT
        asub.id,
        asub.student_id,
        COALESCE(p.display_name, p.first_name || ' ' || p.last_name, u.email) as student_name,
        asub.submitted_at,
        asub.score,
        asub.status,
        EXTRACT(EPOCH FROM (asub.submitted_at - asub.created_at)) / 60 as time_taken_minutes
      FROM assignment_submissions asub
      JOIN auth.users u ON asub.student_id = u.id
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      WHERE asub.assignment_id = $1
      ORDER BY asub.submitted_at DESC NULLS LAST
    `;
    const submissionsResult = await this.pool.query(submissionsQuery, [assignmentId]);

    const totalAssigned = submissionsResult.rows.length;
    const totalSubmitted = submissionsResult.rows.filter((s) => s.status === 'submitted' || s.status === 'graded').length;
    const totalGraded = submissionsResult.rows.filter((s) => s.status === 'graded').length;

    const submittedScores = submissionsResult.rows.filter((s) => s.score !== null).map((s) => parseFloat(s.score));
    const averageScore = submittedScores.length > 0
      ? submittedScores.reduce((sum, score) => sum + score, 0) / submittedScores.length
      : 0;

    const submissionRate = totalAssigned > 0 ? (totalSubmitted / totalAssigned) * 100 : 0;

    return {
      assignment_id: assignment.id,
      assignment_title: assignment.title,
      total_assigned: totalAssigned,
      total_submitted: totalSubmitted,
      total_graded: totalGraded,
      average_score: Math.round(averageScore * 100) / 100,
      submission_rate: Math.round(submissionRate),
      submissions: submissionsResult.rows.map((row) => ({
        student_id: row.student_id,
        student_name: row.student_name,
        submitted_at: row.submitted_at,
        score: row.score ? parseFloat(row.score) : undefined,
        status: row.status,
        time_taken_minutes: row.time_taken_minutes ? Math.round(parseFloat(row.time_taken_minutes)) : undefined,
      })),
    };
  }

  /**
   * Get engagement metrics for teacher
   */
  async getEngagementMetrics(
    teacherId: string,
    startDate?: string,
    endDate?: string
  ): Promise<EngagementMetrics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    // Get all students from teacher's classrooms
    const studentsQuery = `
      SELECT COUNT(DISTINCT cs.student_id) as total
      FROM classrooms c
      JOIN classroom_students cs ON c.id = cs.classroom_id
      WHERE c.teacher_id = $1
    `;
    const studentsResult = await this.pool.query(studentsQuery, [teacherId]);
    const totalStudents = parseInt(studentsResult.rows[0].total);

    // Get active students in period
    const activeQuery = `
      SELECT COUNT(DISTINCT ep.user_id) as active
      FROM exercise_progress ep
      JOIN classroom_students cs ON ep.user_id = cs.student_id
      JOIN classrooms c ON cs.classroom_id = c.id
      WHERE c.teacher_id = $1
        AND ep.created_at >= $2
        AND ep.created_at <= $3
    `;
    const activeResult = await this.pool.query(activeQuery, [teacherId, start, end]);
    const activeStudents = parseInt(activeResult.rows[0].active);

    // Get total exercises completed
    const exercisesQuery = `
      SELECT COUNT(*) as total
      FROM exercise_progress ep
      JOIN classroom_students cs ON ep.user_id = cs.student_id
      JOIN classrooms c ON cs.classroom_id = c.id
      WHERE c.teacher_id = $1
        AND ep.status = 'completed'
        AND ep.completed_at >= $2
        AND ep.completed_at <= $3
    `;
    const exercisesResult = await this.pool.query(exercisesQuery, [teacherId, start, end]);
    const totalExercises = parseInt(exercisesResult.rows[0].total);

    // Get daily activity
    const dailyQuery = `
      SELECT
        DATE(ep.created_at) as date,
        COUNT(DISTINCT ep.user_id) as active_students,
        COUNT(*) FILTER (WHERE ep.status = 'completed') as exercises_completed,
        COALESCE(AVG(ep.score) FILTER (WHERE ep.status = 'completed'), 0) as average_score
      FROM exercise_progress ep
      JOIN classroom_students cs ON ep.user_id = cs.student_id
      JOIN classrooms c ON cs.classroom_id = c.id
      WHERE c.teacher_id = $1
        AND ep.created_at >= $2
        AND ep.created_at <= $3
      GROUP BY DATE(ep.created_at)
      ORDER BY date DESC
      LIMIT 30
    `;
    const dailyResult = await this.pool.query(dailyQuery, [teacherId, start, end]);

    const engagementRate = totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0;

    return {
      period: `${start} to ${end}`,
      total_students: totalStudents,
      active_students: activeStudents,
      engagement_rate: Math.round(engagementRate),
      average_session_duration: 0, // Would need session tracking
      total_exercises_completed: totalExercises,
      daily_activity: dailyResult.rows.map((row) => ({
        date: row.date,
        active_students: parseInt(row.active_students),
        exercises_completed: parseInt(row.exercises_completed),
        average_score: Math.round(parseFloat(row.average_score) * 100) / 100,
      })),
    };
  }
}
