/**
 * Modules Service
 *
 * Business logic for educational modules management.
 *
 * @module modules.service
 */

import { Pool } from 'pg';
import { ModulesRepository } from './modules.repository';
import {
  ModuleResponse,
  ModuleDetailResponse,
  CreateModuleDto,
  PaginationQuery,
  FilterOptions
} from './educational.types';

export class ModulesService {
  private repository: ModulesRepository;

  constructor(pool: Pool) {
    this.repository = new ModulesRepository(pool);
  }

  /**
   * Get all modules with pagination
   */
  async getAllModules(
    filters?: FilterOptions,
    pagination?: PaginationQuery
  ): Promise<{ modules: ModuleResponse[]; total: number; page: number; totalPages: number }> {
    const result = await this.repository.getAllModules(filters, pagination);

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const totalPages = Math.ceil(result.total / limit);

    return {
      modules: result.modules,
      total: result.total,
      page,
      totalPages
    };
  }

  /**
   * Get module by ID
   */
  async getModuleById(moduleId: string): Promise<ModuleResponse> {
    const module = await this.repository.getModuleById(moduleId);

    if (!module) {
      throw new Error('Module not found');
    }

    return module;
  }

  /**
   * Get module details with exercises
   */
  async getModuleDetails(
    moduleId: string,
    userId?: string
  ): Promise<ModuleDetailResponse> {
    const module = await this.repository.getModuleDetails(moduleId, userId);

    if (!module) {
      throw new Error('Module not found');
    }

    return module;
  }

  /**
   * Create new module (Admin only)
   */
  async createModule(
    moduleData: CreateModuleDto,
    createdBy: string
  ): Promise<ModuleResponse> {
    // Validate module data
    this.validateModuleData(moduleData);

    // Create module
    const module = await this.repository.createModule(moduleData, createdBy);

    return module;
  }

  /**
   * Update module (Admin only)
   */
  async updateModule(
    moduleId: string,
    updates: Partial<CreateModuleDto>
  ): Promise<ModuleResponse> {
    // Check if module exists
    const existingModule = await this.repository.getModuleById(moduleId);
    if (!existingModule) {
      throw new Error('Module not found');
    }

    // Validate updates
    if (updates.title !== undefined || updates.description !== undefined) {
      this.validateModuleData(updates as CreateModuleDto);
    }

    // Update module
    const updatedModule = await this.repository.updateModule(moduleId, updates);

    if (!updatedModule) {
      throw new Error('Failed to update module');
    }

    return updatedModule;
  }

  /**
   * Delete module (Admin only)
   */
  async deleteModule(moduleId: string): Promise<void> {
    // Check if module exists
    const existingModule = await this.repository.getModuleById(moduleId);
    if (!existingModule) {
      throw new Error('Module not found');
    }

    // Delete module (soft delete)
    const deleted = await this.repository.deleteModule(moduleId);

    if (!deleted) {
      throw new Error('Failed to delete module');
    }
  }

  /**
   * Publish/Unpublish module
   */
  async updatePublishStatus(
    moduleId: string,
    isPublished: boolean
  ): Promise<void> {
    // Check if module exists
    const existingModule = await this.repository.getModuleById(moduleId);
    if (!existingModule) {
      throw new Error('Module not found');
    }

    const updated = await this.repository.updatePublishStatus(moduleId, isPublished);

    if (!updated) {
      throw new Error('Failed to update publish status');
    }
  }

  /**
   * Get modules by rank requirement
   */
  async getModulesByRank(rank: string): Promise<ModuleResponse[]> {
    return this.repository.getModulesByRank(rank);
  }

  /**
   * Check if user has access to module
   */
  async checkModuleAccess(moduleId: string, userRank: string): Promise<boolean> {
    return this.repository.checkModuleAccess(moduleId, userRank);
  }

  /**
   * Get module exercises list
   */
  async getModuleExercises(moduleId: string, userId?: string) {
    const module = await this.repository.getModuleDetails(moduleId, userId);
    if (!module) {
      throw new Error('Module not found');
    }

    return module.exercises;
  }

  /**
   * Get all modules for a specific user with progress
   */
  async getUserModules(userId: string): Promise<any[]> {
    return this.repository.getUserModules(userId);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validate module data
   */
  private validateModuleData(data: Partial<CreateModuleDto>): void {
    if (data.title && data.title.trim().length < 3) {
      throw new Error('Module title must be at least 3 characters');
    }

    if (data.description && data.description.trim().length < 10) {
      throw new Error('Module description must be at least 10 characters');
    }

    if (data.orderIndex !== undefined && data.orderIndex < 1) {
      throw new Error('Module order index must be greater than 0');
    }

    if (data.estimatedDurationMinutes !== undefined && data.estimatedDurationMinutes < 1) {
      throw new Error('Estimated duration must be at least 1 minute');
    }

    if (data.xpReward !== undefined && data.xpReward < 0) {
      throw new Error('XP reward cannot be negative');
    }

    if (data.mlCoinsReward !== undefined && data.mlCoinsReward < 0) {
      throw new Error('ML Coins reward cannot be negative');
    }
  }
}
