/**
 * Student Progress Controller
 *
 * HTTP request handlers for student progress and analytics endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { StudentProgressService } from './student-progress.service';

export class StudentProgressController {
  constructor(private studentProgressService: StudentProgressService) {}

  /**
   * GET /api/teacher/students/:id/progress
   * Get student progress overview
   */
  getStudentProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id: studentId } = req.params;
      const teacherId = req.user!.id;

      const progress = await this.studentProgressService.getStudentProgress(studentId, teacherId);

      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/students/:id/analytics
   * Get detailed student analytics
   */
  getStudentAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id: studentId } = req.params;
      const teacherId = req.user!.id;

      const analytics = await this.studentProgressService.getStudentAnalytics(studentId, teacherId);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/teacher/students/:id/note
   * Add teacher note for student
   */
  addTeacherNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id: studentId } = req.params;
      const teacherId = req.user!.id;
      const { note, is_private } = req.body;

      if (!note || typeof note !== 'string' || note.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Note text is required',
        });
      }

      const createdNote = await this.studentProgressService.addTeacherNote(
        studentId,
        teacherId,
        note.trim(),
        is_private !== false // Default to true if not specified
      );

      res.status(201).json({
        success: true,
        data: createdNote,
        message: 'Teacher note added successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/teacher/students/:id/notes
   * Get teacher notes for student
   */
  getTeacherNotes = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id: studentId } = req.params;
      const teacherId = req.user!.id;

      const notes = await this.studentProgressService.getTeacherNotes(studentId, teacherId);

      res.json({
        success: true,
        data: notes,
      });
    } catch (error) {
      next(error);
    }
  };
}
