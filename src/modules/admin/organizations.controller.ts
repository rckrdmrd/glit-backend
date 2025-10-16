/**
 * Organizations Controller
 *
 * HTTP request handlers for organization management endpoints.
 */

import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { OrganizationsService } from './organizations.service';
import { pool } from '../../database/pool';
import { log } from '../../shared/utils/logger';

export class OrganizationsController {
  private service: OrganizationsService;

  constructor() {
    this.service = new OrganizationsService(pool);
  }

  /**
   * GET /api/admin/organizations
   * List all organizations with pagination and filters
   */
  getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        subscription_tier,
        is_active,
        search,
      } = req.query;

      const result = await this.service.getAll({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        subscription_tier: subscription_tier as string,
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        search: search as string,
      });

      res.json({
        success: true,
        data: result.organizations,
        meta: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      log.error('Error in getAll organizations:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch organizations',
        },
      });
    }
  };

  /**
   * GET /api/admin/organizations/:id
   * Get organization details
   */
  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const organization = await this.service.getById(id);

      res.json({
        success: true,
        data: organization,
      });
    } catch (error: any) {
      log.error('Error in getById organization:', error);

      if (error.message === 'Organization not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch organization',
        },
      });
    }
  };

  /**
   * POST /api/admin/organizations
   * Create new organization
   */
  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const organization = await this.service.create(
        req.body,
        req.user!.id,
        req.ip
      );

      res.status(201).json({
        success: true,
        data: organization,
      });
    } catch (error: any) {
      log.error('Error in create organization:', error);

      if (error.message === 'Organization slug already exists') {
        res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_EXISTS',
            message: 'Organization slug already exists',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create organization',
        },
      });
    }
  };

  /**
   * PUT /api/admin/organizations/:id
   * Update organization
   */
  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const organization = await this.service.update(
        id,
        req.body,
        req.user!.id,
        req.ip
      );

      res.json({
        success: true,
        data: organization,
      });
    } catch (error: any) {
      log.error('Error in update organization:', error);

      if (error.message === 'Organization not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update organization',
        },
      });
    }
  };

  /**
   * DELETE /api/admin/organizations/:id
   * Soft delete organization
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.service.delete(id, req.user!.id, req.ip);

      res.json({
        success: true,
        data: {
          message: 'Organization deleted successfully',
        },
      });
    } catch (error: any) {
      log.error('Error in delete organization:', error);

      if (error.message === 'Organization not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete organization',
        },
      });
    }
  };

  /**
   * GET /api/admin/organizations/:id/users
   * Get organization users
   */
  getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { page = '1', limit = '20' } = req.query;

      const result = await this.service.getUsers(
        id,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.users,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      log.error('Error in getUsers:', error);

      if (error.message === 'Organization not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch organization users',
        },
      });
    }
  };

  /**
   * PATCH /api/admin/organizations/:id/subscription
   * Update organization subscription
   */
  updateSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { subscription_tier } = req.body;

      const organization = await this.service.updateSubscription(
        id,
        subscription_tier,
        req.user!.id,
        req.ip
      );

      res.json({
        success: true,
        data: organization,
      });
    } catch (error: any) {
      log.error('Error in updateSubscription:', error);

      if (error.message === 'Organization not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update subscription',
        },
      });
    }
  };

  /**
   * PATCH /api/admin/organizations/:id/features
   * Toggle feature flags
   */
  updateFeatureFlags = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { features } = req.body;

      const organization = await this.service.updateFeatureFlags(
        id,
        features,
        req.user!.id,
        req.ip
      );

      res.json({
        success: true,
        data: organization,
      });
    } catch (error: any) {
      log.error('Error in updateFeatureFlags:', error);

      if (error.message === 'Organization not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found',
          },
        });
        return;
      }

      if (error.message.includes('Invalid feature flag')) {
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
          message: 'Failed to update feature flags',
        },
      });
    }
  };
}
