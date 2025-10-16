/**
 * System Controller
 *
 * HTTP request handlers for system management endpoints.
 */

import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { SystemService } from './system.service';
import { pool } from '../../database/pool';
import { log } from '../../shared/utils/logger';

export class SystemController {
  private service: SystemService;

  constructor() {
    this.service = new SystemService(pool);
  }

  /**
   * GET /api/admin/system/health
   * Get system health metrics
   */
  getHealth = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const health = await this.service.getSystemHealth();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      log.error('Error in getHealth:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch system health',
        },
      });
    }
  };

  /**
   * GET /api/admin/system/users
   * Get all users with pagination and filters
   */
  getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        role,
        status,
        tenant_id,
        search,
      } = req.query;

      const result = await this.service.getUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        role: role as string,
        status: status as string,
        tenant_id: tenant_id as string,
        search: search as string,
      });

      res.json({
        success: true,
        data: result.users,
        meta: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      log.error('Error in getUsers:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch users',
        },
      });
    }
  };

  /**
   * PATCH /api/admin/system/users/:id/role
   * Update user role
   */
  updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Role is required',
          },
        });
        return;
      }

      const result = await this.service.updateUserRole(
        id,
        role,
        req.user!.id,
        req.ip
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      log.error('Error in updateUserRole:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      if (error.message === 'Invalid role') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid role. Must be: student, admin_teacher, or super_admin',
          },
        });
        return;
      }

      if (error.message === 'Cannot downgrade the last super admin') {
        res.status(400).json({
          success: false,
          error: {
            code: 'OPERATION_NOT_ALLOWED',
            message: 'Cannot downgrade the last super admin',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user role',
        },
      });
    }
  };

  /**
   * PATCH /api/admin/system/users/:id/status
   * Update user status
   */
  updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status is required',
          },
        });
        return;
      }

      const result = await this.service.updateUserStatus(
        id,
        status,
        req.user!.id,
        req.ip
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      log.error('Error in updateUserStatus:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      if (error.message === 'Invalid status') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status. Must be: active, inactive, suspended, or pending',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user status',
        },
      });
    }
  };

  /**
   * GET /api/admin/system/logs
   * Get system logs
   */
  getLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { limit = '1000', log_level, start_date, end_date } = req.query;

      const logs = await this.service.getSystemLogs({
        limit: parseInt(limit as string),
        log_level: log_level as string,
        start_date: start_date ? new Date(start_date as string) : undefined,
        end_date: end_date ? new Date(end_date as string) : undefined,
      });

      res.json({
        success: true,
        data: logs,
        meta: {
          count: logs.length,
        },
      });
    } catch (error) {
      log.error('Error in getLogs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch system logs',
        },
      });
    }
  };

  /**
   * POST /api/admin/system/maintenance
   * Toggle maintenance mode
   */
  toggleMaintenance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'enabled must be a boolean',
          },
        });
        return;
      }

      const result = await this.service.toggleMaintenanceMode(
        enabled,
        req.user!.id,
        req.ip
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      log.error('Error in toggleMaintenance:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to toggle maintenance mode',
        },
      });
    }
  };

  /**
   * GET /api/admin/system/statistics
   * Get system statistics
   */
  getStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const statistics = await this.service.getSystemStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      log.error('Error in getStatistics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch system statistics',
        },
      });
    }
  };
}
