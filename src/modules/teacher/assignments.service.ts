/**
 * Assignment Service
 *
 * Business logic for assignment management.
 */

import { AssignmentRepository } from './assignments.repository';
import {
  Assignment,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignToDto,
  GradeSubmissionDto,
  PaginationQuery,
} from './teacher.types';
import { log } from '../../shared/utils/logger';

export class AssignmentService {
  constructor(private assignmentRepository: AssignmentRepository) {}

  /**
   * Create new assignment
   */
  async createAssignment(teacherId: string, data: CreateAssignmentDto): Promise<any> {
    log.info(`Creating assignment for teacher ${teacherId}: ${data.title}`);

    // Verify exercises exist
    const verification = await this.assignmentRepository.verifyExercises(data.exercise_ids);
    if (verification.invalid.length > 0) {
      throw new Error(`Invalid exercise IDs: ${verification.invalid.join(', ')}`);
    }

    const assignment = await this.assignmentRepository.createAssignment(teacherId, data);

    // Get full assignment with exercises
    return await this.assignmentRepository.getAssignmentWithExercises(assignment.id);
  }

  /**
   * Get all assignments for teacher
   */
  async getTeacherAssignments(
    teacherId: string,
    pagination: PaginationQuery
  ): Promise<{ assignments: Assignment[]; total: number; page: number; totalPages: number }> {
    const result = await this.assignmentRepository.getTeacherAssignments(teacherId, pagination);
    const totalPages = Math.ceil(result.total / pagination.limit);

    return {
      assignments: result.assignments,
      total: result.total,
      page: pagination.page,
      totalPages,
    };
  }

  /**
   * Get assignment details
   */
  async getAssignmentById(assignmentId: string): Promise<any> {
    const assignment = await this.assignmentRepository.getAssignmentWithExercises(assignmentId);

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return assignment;
  }

  /**
   * Update assignment
   */
  async updateAssignment(assignmentId: string, data: UpdateAssignmentDto): Promise<Assignment> {
    log.info(`Updating assignment ${assignmentId}`);

    const assignment = await this.assignmentRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return await this.assignmentRepository.updateAssignment(assignmentId, data);
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    log.info(`Deleting assignment ${assignmentId}`);

    const assignment = await this.assignmentRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    await this.assignmentRepository.deleteAssignment(assignmentId);
  }

  /**
   * Assign to classrooms and/or students
   */
  async assignTo(assignmentId: string, data: AssignToDto): Promise<{ assigned: number }> {
    log.info(`Assigning assignment ${assignmentId} to classrooms/students`);

    const assignment = await this.assignmentRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return await this.assignmentRepository.assignTo(assignmentId, data);
  }

  /**
   * Get assignment submissions
   */
  async getAssignmentSubmissions(assignmentId: string): Promise<any[]> {
    const assignment = await this.assignmentRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return await this.assignmentRepository.getAssignmentSubmissions(assignmentId);
  }

  /**
   * Grade submission
   */
  async gradeSubmission(
    assignmentId: string,
    submissionId: string,
    data: GradeSubmissionDto,
    gradedBy: string
  ): Promise<any> {
    log.info(`Grading submission ${submissionId} for assignment ${assignmentId}`);

    // Verify assignment exists
    const assignment = await this.assignmentRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Verify submission exists
    const submission = await this.assignmentRepository.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    // Verify submission belongs to assignment
    if (submission.assignment_id !== assignmentId) {
      throw new Error('Submission does not belong to this assignment');
    }

    return await this.assignmentRepository.gradeSubmission(
      submissionId,
      data.score,
      data.feedback,
      gradedBy
    );
  }
}
