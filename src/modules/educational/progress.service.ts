/**
 * Progress Service
 * Business logic for progress tracking.
 */

import { Pool } from 'pg';
import { ProgressRepository } from './progress.repository';
import { UserProgressOverview, ModuleProgressDetail, ExerciseAttempt } from './educational.types';

export class ProgressService {
  private repository: ProgressRepository;

  constructor(pool: Pool) {
    this.repository = new ProgressRepository(pool);
  }

  async getUserProgress(userId: string): Promise<UserProgressOverview> {
    const progress = await this.repository.getUserProgress(userId);
    if (!progress) {
      throw new Error('User progress not found');
    }
    return progress;
  }

  async getModuleProgress(userId: string, moduleId: string): Promise<ModuleProgressDetail> {
    const progress = await this.repository.getModuleProgress(userId, moduleId);
    if (!progress) {
      throw new Error('Module progress not found');
    }
    return progress;
  }

  async getExerciseAttempts(userId: string, filters?: any): Promise<ExerciseAttempt[]> {
    return this.repository.getExerciseAttempts(userId, filters);
  }

  async updateModuleProgress(userId: string, moduleId: string, exerciseCompleted: boolean): Promise<void> {
    await this.repository.upsertModuleProgress(userId, moduleId, exerciseCompleted);
  }
}
