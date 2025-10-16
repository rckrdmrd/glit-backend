/**
 * Classroom Controller
 *
 * HTTP request handlers for classroom management endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { ClassroomService } from './classroom.service';
import { CreateClassroomDto, UpdateClassroomDto, AddStudentsDto, PaginationQuery } from './teacher.types';

export class ClassroomController {
  constructor(private classroomService: ClassroomService) {}

  /**
   * POST /api/teacher/classrooms
   * Create new classroom
   */
  createClassroom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data: CreateClassroomDto = req.body;
      const teacherId = req.user!.id;

      const classroom = await this.classroomService.createClassroom(teacherId, data);

      res.status(201).json({
        success: true,
        data: classroom,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/classrooms
   * Get all classrooms for authenticated teacher
   */
  getClassrooms = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.user!.id;

      const pagination: PaginationQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || 'created_at',
        order: (req.query.order as 'asc' | 'desc') || 'desc',
      };

      const result = await this.classroomService.getTeacherClassrooms(teacherId, pagination);

      res.json({
        success: true,
        data: result.classrooms,
        meta: {
          total: result.total,
          page: result.page,
          limit: pagination.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/classrooms/:id
   * Get classroom details
   */
  getClassroomById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const classroom = await this.classroomService.getClassroomById(id);

      res.json({
        success: true,
        data: classroom,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/teacher/classrooms/:id
   * Update classroom
   */
  updateClassroom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: UpdateClassroomDto = req.body;

      const classroom = await this.classroomService.updateClassroom(id, data);

      res.json({
        success: true,
        data: classroom,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/teacher/classrooms/:id
   * Delete classroom
   */
  deleteClassroom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await this.classroomService.deleteClassroom(id);

      res.json({
        success: true,
        data: {
          message: 'Classroom deleted successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/classrooms/:id/students
   * Get students in classroom
   */
  getClassroomStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const students = await this.classroomService.getClassroomStudents(id);

      res.json({
        success: true,
        data: students,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/teacher/classrooms/:id/students
   * Add students to classroom (bulk)
   */
  addStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: AddStudentsDto = req.body;

      const result = await this.classroomService.addStudents(id, data);

      res.json({
        success: true,
        data: {
          message: `Successfully added ${result.added} student(s)`,
          added: result.added,
          invalid: result.invalid.length > 0 ? result.invalid : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/teacher/classrooms/:classId/students/:studentId
   * Remove student from classroom
   */
  removeStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { classId, studentId } = req.params;

      await this.classroomService.removeStudent(classId, studentId);

      res.json({
        success: true,
        data: {
          message: 'Student removed from classroom successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
