/**
 * Content Controller
 *
 * HTTP request handlers for content management endpoints.
 */

import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { ContentService } from './content.service';
import { pool } from '../../database/pool';
import { log } from '../../shared/utils/logger';

export class ContentController {
  private service: ContentService;

  constructor() {
    this.service = new ContentService(pool);
  }

  /**
   * GET /api/admin/content/exercises/pending
   * Get pending exercises for approval
   */
  getPendingExercises = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { page = '1', limit = '20', tenant_id } = req.query;

      const result = await this.service.getPendingExercises({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        tenant_id: tenant_id as string,
      });

      res.json({
        success: true,
        data: result.exercises,
        meta: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      log.error('Error in getPendingExercises:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pending exercises',
        },
      });
    }
  };

  /**
   * POST /api/admin/content/exercises/:id/approve
   * Approve exercise
   */
  approveExercise = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.service.approveExercise(id, req.user!.id, req.ip);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      log.error('Error in approveExercise:', error);

      if (error.message === 'Exercise not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Exercise not found',
          },
        });
        return;
      }

      if (error.message === 'Exercise is not in pending status') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Exercise is not in pending status',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to approve exercise',
        },
      });
    }
  };

  /**
   * POST /api/admin/content/exercises/:id/reject
   * Reject exercise
   */
  rejectExercise = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Rejection reason is required',
          },
        });
        return;
      }

      const result = await this.service.rejectExercise(id, reason, req.user!.id, req.ip);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      log.error('Error in rejectExercise:', error);

      if (error.message === 'Exercise not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Exercise not found',
          },
        });
        return;
      }

      if (error.message === 'Exercise is not in pending status') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Exercise is not in pending status',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reject exercise',
        },
      });
    }
  };

  /**
   * GET /api/admin/content/media
   * Get media library
   */
  getMediaLibrary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { page = '1', limit = '50', file_type, tenant_id } = req.query;

      const result = await this.service.getMediaLibrary({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        file_type: file_type as string,
        tenant_id: tenant_id as string,
      });

      res.json({
        success: true,
        data: result.media,
        meta: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      log.error('Error in getMediaLibrary:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch media library',
        },
      });
    }
  };

  /**
   * DELETE /api/admin/content/media/:id
   * Delete media file
   */
  deleteMedia = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.service.deleteMedia(id, req.user!.id, req.ip);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      log.error('Error in deleteMedia:', error);

      if (error.message === 'Media file not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Media file not found',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete media file',
        },
      });
    }
  };

  /**
   * POST /api/admin/content/version
   * Create content version
   */
  createContentVersion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { content_type, content_id, content_data, tenant_id } = req.body;

      if (!content_type || !content_id || !content_data) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'content_type, content_id, and content_data are required',
          },
        });
        return;
      }

      const version = await this.service.createContentVersion(
        content_type,
        content_id,
        content_data,
        req.user!.id,
        req.ip,
        tenant_id
      );

      res.status(201).json({
        success: true,
        data: version,
      });
    } catch (error: any) {
      log.error('Error in createContentVersion:', error);

      if (error.message.includes('Invalid content type')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create content version',
        },
      });
    }
  };
}
