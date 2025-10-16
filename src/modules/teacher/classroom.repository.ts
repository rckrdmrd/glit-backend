/**
 * Classroom Repository
 *
 * Database operations for classroom management.
 */

import { Pool } from 'pg';
import { Classroom, CreateClassroomDto, UpdateClassroomDto, PaginationQuery } from './teacher.types';
import { log } from '../../shared/utils/logger';

export class ClassroomRepository {
  constructor(private pool: Pool) {}

  /**
   * Create new classroom
   */
  async createClassroom(teacherId: string, data: CreateClassroomDto): Promise<Classroom> {
    const query = `
      INSERT INTO classrooms (
        teacher_id, name, description, school_id, grade_level, subject, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `;

    const values = [
      teacherId,
      data.name,
      data.description || null,
      data.school_id || null,
      data.grade_level || null,
      data.subject || null,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all classrooms for a teacher with pagination
   */
  async getTeacherClassrooms(
    teacherId: string,
    pagination: PaginationQuery
  ): Promise<{ classrooms: Classroom[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.limit;
    const orderBy = pagination.sortBy || 'created_at';
    const order = pagination.order || 'desc';

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM classrooms WHERE teacher_id = $1';
    const countResult = await this.pool.query(countQuery, [teacherId]);
    const total = parseInt(countResult.rows[0].count);

    // Get classrooms
    const query = `
      SELECT * FROM classrooms
      WHERE teacher_id = $1
      ORDER BY ${orderBy} ${order}
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [teacherId, pagination.limit, offset]);

    return {
      classrooms: result.rows,
      total,
    };
  }

  /**
   * Get classroom by ID
   */
  async getClassroomById(classroomId: string): Promise<Classroom | null> {
    const query = 'SELECT * FROM classrooms WHERE id = $1';
    const result = await this.pool.query(query, [classroomId]);
    return result.rows[0] || null;
  }

  /**
   * Get classroom with student count
   */
  async getClassroomWithStudentCount(classroomId: string): Promise<any> {
    const query = `
      SELECT
        c.*,
        COUNT(cs.student_id) as student_count
      FROM classrooms c
      LEFT JOIN classroom_students cs ON c.id = cs.classroom_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await this.pool.query(query, [classroomId]);
    return result.rows[0] || null;
  }

  /**
   * Update classroom
   */
  async updateClassroom(classroomId: string, data: UpdateClassroomDto): Promise<Classroom> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.grade_level !== undefined) {
      fields.push(`grade_level = $${paramCount++}`);
      values.push(data.grade_level);
    }
    if (data.subject !== undefined) {
      fields.push(`subject = $${paramCount++}`);
      values.push(data.subject);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(classroomId);

    const query = `
      UPDATE classrooms
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete classroom
   */
  async deleteClassroom(classroomId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete all student associations
      await client.query('DELETE FROM classroom_students WHERE classroom_id = $1', [classroomId]);

      // Delete all assignment associations
      await client.query('DELETE FROM assignment_classrooms WHERE classroom_id = $1', [classroomId]);

      // Delete classroom
      await client.query('DELETE FROM classrooms WHERE id = $1', [classroomId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add students to classroom (bulk)
   */
  async addStudents(classroomId: string, studentIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const studentId of studentIds) {
        // Use ON CONFLICT to avoid duplicates
        await client.query(
          `INSERT INTO classroom_students (classroom_id, student_id)
           VALUES ($1, $2)
           ON CONFLICT (classroom_id, student_id) DO NOTHING`,
          [classroomId, studentId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove student from classroom
   */
  async removeStudent(classroomId: string, studentId: string): Promise<void> {
    const query = 'DELETE FROM classroom_students WHERE classroom_id = $1 AND student_id = $2';
    await this.pool.query(query, [classroomId, studentId]);
  }

  /**
   * Get students in classroom
   */
  async getClassroomStudents(classroomId: string): Promise<any[]> {
    const query = `
      SELECT
        u.id,
        u.email,
        p.first_name,
        p.last_name,
        p.display_name,
        p.avatar_url,
        cs.joined_at
      FROM classroom_students cs
      JOIN auth.users u ON cs.student_id = u.id
      LEFT JOIN auth_management.profiles p ON u.id = p.user_id
      WHERE cs.classroom_id = $1
      ORDER BY p.last_name, p.first_name
    `;

    const result = await this.pool.query(query, [classroomId]);
    return result.rows;
  }

  /**
   * Verify students exist and have student role
   */
  async verifyStudents(studentIds: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const query = `
      SELECT id FROM auth.users
      WHERE id = ANY($1) AND role = 'student'
    `;

    const result = await this.pool.query(query, [studentIds]);
    const validIds = result.rows.map((row) => row.id);
    const invalidIds = studentIds.filter((id) => !validIds.includes(id));

    return {
      valid: validIds,
      invalid: invalidIds,
    };
  }
}
