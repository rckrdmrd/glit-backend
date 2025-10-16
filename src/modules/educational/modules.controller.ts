/**
 * Modules Controller
 *
 * HTTP request handlers for modules endpoints.
 *
 * @module modules.controller
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { ModulesService } from './modules.service';
import { CreateModuleDto, PaginationQuery, FilterOptions } from './educational.types';

export class ModulesController {
  constructor(private modulesService: ModulesService) {}

  /**
   * GET /api/educational/modules
   * Get all modules with pagination
   */
  getAllModules = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const pagination: PaginationQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || 'order_index',
        order: (req.query.order as 'asc' | 'desc') || 'asc'
      };

      const filters: FilterOptions = {
        difficulty: req.query.difficulty as any
      };

      const result = await this.modulesService.getAllModules(filters, pagination);

      res.json({
        success: true,
        data: result.modules,
        meta: {
          total: result.total,
          page: result.page,
          limit: pagination.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/educational/modules/:moduleId
   * Get specific module by ID
   */
  getModuleById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;
      const userId = req.user?.id; // Optional user context

      const module = await this.modulesService.getModuleDetails(moduleId, userId);

      res.json({
        success: true,
        data: module
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/educational/modules/:moduleId/exercises
   * Get all exercises in a module
   */
  getModuleExercises = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;
      const userId = req.user?.id;

      const exercises = await this.modulesService.getModuleExercises(moduleId, userId);

      res.json({
        success: true,
        data: exercises
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/educational/modules
   * Create new module (Admin only)
   */
  createModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const moduleData: CreateModuleDto = req.body;
      const createdBy = req.user?.id;

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }

      const module = await this.modulesService.createModule(moduleData, createdBy);

      res.status(201).json({
        success: true,
        data: module
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/educational/modules/:moduleId
   * Update module (Admin only)
   */
  updateModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;
      const updates: Partial<CreateModuleDto> = req.body;

      const module = await this.modulesService.updateModule(moduleId, updates);

      res.json({
        success: true,
        data: module
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/educational/modules/:moduleId
   * Delete module (Admin only)
   */
  deleteModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;

      await this.modulesService.deleteModule(moduleId);

      res.json({
        success: true,
        data: {
          message: 'Module deleted successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/educational/modules/:moduleId/publish
   * Publish or unpublish module (Admin only)
   */
  updatePublishStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;
      const { isPublished } = req.body;

      if (typeof isPublished !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'isPublished must be a boolean'
          }
        });
      }

      await this.modulesService.updatePublishStatus(moduleId, isPublished);

      res.json({
        success: true,
        data: {
          message: `Module ${isPublished ? 'published' : 'unpublished'} successfully`
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/educational/modules/rank/:rank
   * Get modules by rank requirement
   */
  getModulesByRank = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { rank } = req.params;

      const modules = await this.modulesService.getModulesByRank(rank);

      res.json({
        success: true,
        data: modules
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/educational/modules/:moduleId/access
   * Check if user has access to module
   */
  checkModuleAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;
      const userRank = req.user?.rank || 'nacom';

      const hasAccess = await this.modulesService.checkModuleAccess(moduleId, userRank);

      res.json({
        success: true,
        data: {
          hasAccess,
          userRank
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/educational/modules/user/:userId
   * Get all modules for specific user with their progress
   */
  getUserModules = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const modules = await this.modulesService.getUserModules(userId);

      res.json({
        success: true,
        data: modules
      });
    } catch (error) {
      next(error);
    }
  };
}
