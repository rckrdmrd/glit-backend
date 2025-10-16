/**
 * Assignment Repository
 *
 * Database operations for assignment management.
 */

import { Pool } from 'pg';
import {
  Assignment,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignToDto,
  AssignmentSubmission,
  PaginationQuery,
} from './teacher.types';
import { log } from '../../shared/utils/logger';

export class AssignmentRepository {
  constructor(private pool: Pool) {}

  /**
   * Create new assignment
   */
  async createAssignment(teacherId: string, data: CreateAssignmentDto): Promise<Assignment> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create assignment
      const assignmentQuery = `
        INSERT INTO assignments (
          teacher_id, title, description, assignment_type, due_date, total_points, is_published
        ) VALUES ($1, $2, $3, $4, $5, $6, false)
        RETURNING *
      `;

      const assignmentValues = [
        teacherId,
        data.title,
        data.description || null,
        data.assignment_type,
        data.due_date || null,
        data.total_points || 100,
      ];

      const assignmentResult = await client.query(assignmentQuery, assignmentValues);
      const assignment = assignmentResult.rows[0];

      // Add exercises to assignment
      for (const exerciseId of data.exercise_ids) {
        await client.query(
          'INSERT INTO assignment_exercises (assignment_id, exercise_id) VALUES ($1, $2)',
          [assignment.id, exerciseId]
        );
      }

      await client.query('COMMIT');
      return assignment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all assignments for a teacher with pagination
   */
  async getTeacherAssignments(
    teacherId: string,
    pagination: PaginationQuery
  ): Promise<{ assignments: Assignment[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.limit;
    const orderBy = pagination.sortBy || 'created_at';
    const order = pagination.order || 'desc';

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM assignments WHERE teacher_id = $1';
    const countResult = await this.pool.query(countQuery, [teacherId]);
    const total = parseInt(countResult.rows[0].count);

    // Get assignments
    const query = `
      SELECT * FROM assignments
      WHERE teacher_id = $1
      ORDER BY ${orderBy} ${order}
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [teacherId, pagination.limit, offset]);

    return {
      assignments: result.rows,
      total,
    };
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(assignmentId: string): Promise<Assignment | null> {
    const query = 'SELECT * FROM assignments WHERE id = $1';
    const result = await this.pool.query(query, [assignmentId]);
    return result.rows[0] || null;
  }

  /**
   * Get assignment with exercises
   */
  async getAssignmentWithExercises(assignmentId: string): Promise<any> {
    const query = `
      SELECT
        a.*,
        json_agg(
          json_build_object(
            'id', e.id,
            'title', e.title,
            'difficulty', e.difficulty,
            'points', e.points
          )
        ) FILTER (WHERE e.id IS NOT NULL) as exercises
      FROM assignments a
      LEFT JOIN assignment_exercises ae ON a.id = ae.assignment_id
      LEFT JOIN exercises e ON ae.exercise_id = e.id
      WHERE a.id = $1
      GROUP BY a.id
    `;

    const result = await this.pool.query(query, [assignmentId]);
    return result.rows[0] || null;
  }

  /**
   * Update assignment
   */
  async updateAssignment(assignmentId: string, data: UpdateAssignmentDto): Promise<Assignment> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.assignment_type !== undefined) {
      fields.push(`assignment_type = $${paramCount++}`);
      values.push(data.assignment_type);
    }
    if (data.due_date !== undefined) {
      fields.push(`due_date = $${paramCount++}`);
      values.push(data.due_date);
    }
    if (data.total_points !== undefined) {
      fields.push(`total_points = $${paramCount++}`);
      values.push(data.total_points);
    }
    if (data.is_published !== undefined) {
      fields.push(`is_published = $${paramCount++}`);
      values.push(data.is_published);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(assignmentId);

    const query = `
      UPDATE assignments
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete all related records
      await client.query('DELETE FROM assignment_exercises WHERE assignment_id = $1', [assignmentId]);
      await client.query('DELETE FROM assignment_classrooms WHERE assignment_id = $1', [assignmentId]);
      await client.query('DELETE FROM assignment_students WHERE assignment_id = $1', [assignmentId]);
      await client.query('DELETE FROM assignment_submissions WHERE assignment_id = $1', [assignmentId]);
      await client.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Assign to classrooms and/or students
   */
  async assignTo(assignmentId: string, data: AssignToDto): Promise<{ assigned: number }> {
    const client = await this.pool.connect();
    let totalAssigned = 0;

    try {
      await client.query('BEGIN');

      // Assign to classrooms
      if (data.classroom_ids && data.classroom_ids.length > 0) {
        for (const classroomId of data.classroom_ids) {
          await client.query(
            `INSERT INTO assignment_classrooms (assignment_id, classroom_id)
             VALUES ($1, $2)
             ON CONFLICT (assignment_id, classroom_id) DO NOTHING`,
            [assignmentId, classroomId]
          );

          // Create submissions for all students in classroom
          const studentsQuery = 'SELECT student_id FROM classroom_students WHERE classroom_id = $1';
          const studentsResult = await client.query(studentsQuery, [classroomId]);

          for (const row of studentsResult.rows) {
            await client.query(
              `INSERT INTO assignment_submissions (assignment_id, student_id, status)
               VALUES ($1, $2, 'not_started')
               ON CONFLICT (assignment_id, student_id) DO NOTHING`,
              [assignmentId, row.student_id]
            );
            totalAssigned++;
          }
        }
      }

      // Assign to individual students
      if (data.student_ids && data.student_ids.length > 0) {
        for (const studentId of data.student_ids) {
          await client.query(
            `INSERT INTO assignment_students (assignment_id, student_id)
             VALUES ($1, $2)
             ON CONFLICT (assignment_id, student_id) DO NOTHING`,
            [assignmentId, studentId]
          );

          await client.query(
            `INSERT INTO assignment_submissions (assignment_id, student_id, status)
             VALUES ($1, $2, 'not_started')
             ON CONFLICT (assignment_id, student_id) DO NOTHING`,
            [assignmentId, studentId]
          );
          totalAssigned++;
        }
      }

      await client.query('COMMIT');
      return { assigned: totalAssigned };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get assignment submissions
   */
  async getAssignmentSubmissions(assignmentId: string): Promise<any[]> {
    const query = `
      SELECT
        s.id,
        s.assignment_id,
        s.student_id,
        s.submitted_at,
        s.status,
        s.score,
        s.feedback,
        s.graded_at,
        s.graded_by,
        u.email,
        p.first_name,
        p.last_name,
        p.display_name
      FROM assignment_submissions s
      JOIN auth.users u ON s.student_id = u.id
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC NULLS LAST, p.last_name, p.first_name
    `;

    const result = await this.pool.query(query, [assignmentId]);
    return result.rows;
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(submissionId: string): Promise<AssignmentSubmission | null> {
    const query = 'SELECT * FROM assignment_submissions WHERE id = $1';
    const result = await this.pool.query(query, [submissionId]);
    return result.rows[0] || null;
  }

  /**
   * Grade submission
   */
  async gradeSubmission(
    submissionId: string,
    score: number,
    feedback: string | undefined,
    gradedBy: string
  ): Promise<AssignmentSubmission> {
    const query = `
      UPDATE assignment_submissions
      SET
        score = $1,
        feedback = $2,
        graded_by = $3,
        graded_at = CURRENT_TIMESTAMP,
        status = 'graded'
      WHERE id = $4
      RETURNING *
    `;

    const result = await this.pool.query(query, [score, feedback || null, gradedBy, submissionId]);
    return result.rows[0];
  }

  /**
   * Verify exercises exist
   */
  async verifyExercises(exerciseIds: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const query = 'SELECT id FROM exercises WHERE id = ANY($1)';
    const result = await this.pool.query(query, [exerciseIds]);
    const validIds = result.rows.map((row) => row.id);
    const invalidIds = exerciseIds.filter((id) => !validIds.includes(id));

    return {
      valid: validIds,
      invalid: invalidIds,
    };
  }
}
