/**
 * Classroom Service
 *
 * Business logic for classroom management.
 */

import { ClassroomRepository } from './classroom.repository';
import { Classroom, CreateClassroomDto, UpdateClassroomDto, AddStudentsDto, PaginationQuery } from './teacher.types';
import { log } from '../../shared/utils/logger';

export class ClassroomService {
  constructor(private classroomRepository: ClassroomRepository) {}

  /**
   * Create new classroom
   */
  async createClassroom(teacherId: string, data: CreateClassroomDto): Promise<Classroom> {
    log.info(`Creating classroom for teacher ${teacherId}: ${data.name}`);
    return await this.classroomRepository.createClassroom(teacherId, data);
  }

  /**
   * Get all classrooms for teacher
   */
  async getTeacherClassrooms(
    teacherId: string,
    pagination: PaginationQuery
  ): Promise<{ classrooms: any[]; total: number; page: number; totalPages: number }> {
    const result = await this.classroomRepository.getTeacherClassrooms(teacherId, pagination);

    // Enrich with student counts
    const enrichedClassrooms = await Promise.all(
      result.classrooms.map(async (classroom) => {
        const enriched = await this.classroomRepository.getClassroomWithStudentCount(classroom.id);
        return enriched;
      })
    );

    const totalPages = Math.ceil(result.total / pagination.limit);

    return {
      classrooms: enrichedClassrooms,
      total: result.total,
      page: pagination.page,
      totalPages,
    };
  }

  /**
   * Get classroom details
   */
  async getClassroomById(classroomId: string): Promise<any> {
    const classroom = await this.classroomRepository.getClassroomWithStudentCount(classroomId);

    if (!classroom) {
      throw new Error('Classroom not found');
    }

    // Get students
    const students = await this.classroomRepository.getClassroomStudents(classroomId);

    return {
      ...classroom,
      students,
    };
  }

  /**
   * Update classroom
   */
  async updateClassroom(classroomId: string, data: UpdateClassroomDto): Promise<Classroom> {
    log.info(`Updating classroom ${classroomId}`);

    const classroom = await this.classroomRepository.getClassroomById(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }

    return await this.classroomRepository.updateClassroom(classroomId, data);
  }

  /**
   * Delete classroom
   */
  async deleteClassroom(classroomId: string): Promise<void> {
    log.info(`Deleting classroom ${classroomId}`);

    const classroom = await this.classroomRepository.getClassroomById(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }

    await this.classroomRepository.deleteClassroom(classroomId);
  }

  /**
   * Get students in classroom
   */
  async getClassroomStudents(classroomId: string): Promise<any[]> {
    log.info(`Getting students in classroom ${classroomId}`);

    const classroom = await this.classroomRepository.getClassroomById(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }

    return await this.classroomRepository.getClassroomStudents(classroomId);
  }

  /**
   * Add students to classroom (bulk)
   */
  async addStudents(classroomId: string, data: AddStudentsDto): Promise<{ added: number; invalid: string[] }> {
    log.info(`Adding ${data.student_ids.length} students to classroom ${classroomId}`);

    const classroom = await this.classroomRepository.getClassroomById(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }

    // Verify students exist and have student role
    const verification = await this.classroomRepository.verifyStudents(data.student_ids);

    if (verification.valid.length > 0) {
      await this.classroomRepository.addStudents(classroomId, verification.valid);
    }

    return {
      added: verification.valid.length,
      invalid: verification.invalid,
    };
  }

  /**
   * Remove student from classroom
   */
  async removeStudent(classroomId: string, studentId: string): Promise<void> {
    log.info(`Removing student ${studentId} from classroom ${classroomId}`);

    const classroom = await this.classroomRepository.getClassroomById(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }

    await this.classroomRepository.removeStudent(classroomId, studentId);
  }
}
