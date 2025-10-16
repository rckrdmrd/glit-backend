/**
 * Users Controller
 *
 * HTTP request handlers for user management in admin module.
 */

import { Response } from 'express';
import { UsersService } from './users.service';
import { pool } from '../../database/pool';
import { AuthRequest, ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import {
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserBodySchema,
  suspendUserBodySchema,
  forcePasswordResetBodySchema,
  userActivityQuerySchema,
  validateRequest,
} from './users.validation';
import { PaginationParams, UserFilters, UserUpdateData } from './admin.types';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService(pool);
  }

  /**
   * GET /api/admin/users
   *
   * List all users with pagination and filtering.
   */
  getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      // Validate query parameters
      const validatedQuery = validateRequest<PaginationParams & UserFilters>(
        listUsersQuerySchema,
        req.query
      );

      // Extract pagination and filters
      const { page, limit, sort_by, order, ...filters } = validatedQuery;
      const paginationParams: PaginationParams = { page, limit, sort_by, order };

      // Get users
      const result = await this.usersService.getAllUsers(
        req.user.id,
        paginationParams,
        filters
      );

      res.status(200).json({
        success: true,
        data: result.users,
        meta: {
          total: result.total,
          page: page || 1,
          limit: limit || 50,
          total_pages: Math.ceil(result.total / (limit || 50)),
        },
      });
    } catch (error) {
      log.error('Error in getAllUsers controller:', error);

      if ((error as any).code === 'VALIDATION_ERROR') {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: (error as any).message,
            details: (error as any).details,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve users',
        },
      });
    }
  };

  /**
   * GET /api/admin/users/:id
   *
   * Get detailed information about a specific user.
   */
  getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      // Validate user ID parameter
      const { id } = validateRequest<{ id: string }>(userIdParamSchema, req.params);

      // Get user
      const user = await this.usersService.getUserById(req.user.id, id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'User not found',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      log.error('Error in getUserById controller:', error);

      if ((error as any).code === 'VALIDATION_ERROR') {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: (error as any).message,
            details: (error as any).details,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve user',
        },
      });
    }
  };

  /**
   * PATCH /api/admin/users/:id
   *
   * Update user information.
   */
  updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      // Validate parameters
      const { id } = validateRequest<{ id: string }>(userIdParamSchema, req.params);
      const updateData = validateRequest<UserUpdateData>(updateUserBodySchema, req.body);

      // Update user
      const updatedUser = await this.usersService.updateUser(req.user.id, id, updateData);

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
      });
    } catch (error) {
      log.error('Error in updateUser controller:', error);

      if ((error as any).code === 'VALIDATION_ERROR') {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: (error as any).message,
            details: (error as any).details,
          },
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'User not found') {
          res.status(404).json({
            success: false,
            error: {
              code: ErrorCode.NOT_FOUND,
              message: error.message,
            },
          });
          return;
        }

        if (
          error.message === 'Cannot change your own role' ||
          error.message === 'Email already in use' ||
          error.message === 'Tenant not found'
        ) {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: error.message,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to update user',
        },
      });
    }
  };

  /**
   * DELETE /api/admin/users/:id
   *
   * Delete (soft delete) a user account.
   */
  deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      // Validate user ID parameter
      const { id } = validateRequest<{ id: string }>(userIdParamSchema, req.params);

      // Delete user
      await this.usersService.deleteUser(req.user.id, id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      log.error('Error in deleteUser controller:', error);

      if (error instanceof Error) {
        if (error.message === 'User not found') {
          res.status(404).json({
            success: false,
            error: {
              code: ErrorCode.NOT_FOUND,
              message: error.message,
            },
          });
          return;
        }

        if (error.message === 'Cannot delete your own account') {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: error.message,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to delete user',
        },
      });
    }
  };

  /**
   * POST /api/admin/users/:id/suspend
   *
   * Suspend a user account.
   */
  suspendUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      // Validate parameters
      const { id } = validateRequest<{ id: string }>(userIdParamSchema, req.params);
      const suspensionData = validateRequest<{ reason: string; duration_days?: number }>(
        suspendUserBodySchema,
        req.body
      );

      // Suspend user
      await this.usersService.suspendUser(req.user.id, id, suspensionData);

      res.status(200).json({
        success: true,
        message: 'User suspended successfully',
      });
    } catch (error) {
      log.error('Error in suspendUser controller:', error);

      if ((error as any).code === 'VALIDATION_ERROR') {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: (error as any).message,
            details: (error as any).details,
          },
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'User not found') {
          res.status(404).json({
            success: false,
            error: {
              code: ErrorCode.NOT_FOUND,
              message: error.message,
            },
          });
          return;
        }

        if (error.message === 'Cannot suspend your own account') {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: error.message,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to suspend user',
        },
      });
    }
  };

  /**
   * POST /api/admin/users/:id/unsuspend
   *
   * Remove suspension from a user account.
   */
  unsuspendUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      // Validate user ID parameter
      const { id } = validateRequest<{ id: string }>(userIdParamSchema, req.params);

      // Unsuspend user
      await this.usersService.unsuspendUser(req.user.id, id);

      res.status(200).json({
        success: true,
        message: 'User unsuspended successfully',
      });
    } catch (error) {
      log.error('Error in unsuspendUser controller:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to unsuspend user',
        },
      });
    }
  };

  /**
   * POST /api/admin/users/:id/reset-password
   *
   * Force a password reset for a user.
   */
  forcePasswordReset = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      // Validate parameters
      const { id } = validateRequest<{ id: string }>(userIdParamSchema, req.params);
      const resetData = validateRequest<{ reason?: string; notify_user?: boolean }>(
        forcePasswordResetBodySchema,
        req.body
      );

      // Force password reset
      const resetToken = await this.usersService.forcePasswordReset(req.user.id, {
        user_id: id,
        ...resetData,
      });

      res.status(200).json({
        success: true,
        data: {
          reset_token: resetToken,
        },
        message: 'Password reset initiated successfully',
      });
    } catch (error) {
      log.error('Error in forcePasswordReset controller:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to reset password',
        },
      });
    }
  };

  /**
   * GET /api/admin/users/:id/activity
   *
   * Get activity log for a user.
   */
  getUserActivity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      // Validate parameters
      const { id } = validateRequest<{ id: string }>(userIdParamSchema, req.params);
      const { limit } = validateRequest<{ limit?: number }>(
        userActivityQuerySchema,
        req.query
      );

      // Get user activity
      const activities = await this.usersService.getUserActivity(
        req.user.id,
        id,
        limit || 50
      );

      res.status(200).json({
        success: true,
        data: activities,
        meta: {
          count: activities.length,
          limit: limit || 50,
        },
      });
    } catch (error) {
      log.error('Error in getUserActivity controller:', error);

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve user activity',
        },
      });
    }
  };
}
