/**
 * Content Service
 *
 * Business logic for content management operations.
 */

import { Pool } from 'pg';
import { ContentRepository } from './content.repository';
import { AuditService } from './audit.service';
import { log } from '../../shared/utils/logger';

export class ContentService {
  private repository: ContentRepository;
  private auditService: AuditService;

  constructor(private pool: Pool) {
    this.repository = new ContentRepository(pool);
    this.auditService = new AuditService(pool);
  }

  /**
   * Get pending exercises
   */
  async getPendingExercises(filters: {
    page?: number;
    limit?: number;
    tenant_id?: string;
  }) {
    try {
      return await this.repository.getPendingExercises(filters);
    } catch (error) {
      log.error('Error in getPendingExercises:', error);
      throw error;
    }
  }

  /**
   * Approve exercise
   */
  async approveExercise(exerciseId: string, actorId: string, actorIp?: string) {
    try {
      const exercise = await this.repository.getExerciseById(exerciseId);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      if (exercise.status !== 'pending') {
        throw new Error('Exercise is not in pending status');
      }

      await this.repository.approveExercise(exerciseId);

      // Audit log
      await this.auditService.logContentApproved(exerciseId, 'exercise', actorId, actorIp);

      return { message: 'Exercise approved successfully' };
    } catch (error) {
      log.error('Error in approveExercise:', error);
      throw error;
    }
  }

  /**
   * Reject exercise
   */
  async rejectExercise(
    exerciseId: string,
    reason: string,
    actorId: string,
    actorIp?: string
  ) {
    try {
      const exercise = await this.repository.getExerciseById(exerciseId);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      if (exercise.status !== 'pending') {
        throw new Error('Exercise is not in pending status');
      }

      await this.repository.rejectExercise(exerciseId, reason);

      // Audit log
      await this.auditService.logContentRejected(exerciseId, 'exercise', reason, actorId, actorIp);

      return { message: 'Exercise rejected successfully' };
    } catch (error) {
      log.error('Error in rejectExercise:', error);
      throw error;
    }
  }

  /**
   * Get media library
   */
  async getMediaLibrary(filters: {
    page?: number;
    limit?: number;
    file_type?: string;
    tenant_id?: string;
  }) {
    try {
      return await this.repository.getMediaLibrary(filters);
    } catch (error) {
      log.error('Error in getMediaLibrary:', error);
      throw error;
    }
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId: string, actorId: string, actorIp?: string) {
    try {
      const media = await this.repository.getMediaById(mediaId);
      if (!media) {
        throw new Error('Media file not found');
      }

      await this.repository.deleteMedia(mediaId);

      // Audit log
      await this.auditService.logEvent({
        event_type: 'media_deleted',
        action: 'delete',
        resource_type: 'media',
        resource_id: mediaId,
        actor_id: actorId,
        actor_type: 'user',
        actor_ip: actorIp,
        severity: 'info',
        status: 'success',
        description: `Media file deleted: ${media.filename}`,
        old_values: media,
        tags: ['admin', 'media', 'delete'],
      });

      return { message: 'Media file deleted successfully' };
    } catch (error) {
      log.error('Error in deleteMedia:', error);
      throw error;
    }
  }

  /**
   * Create content version
   */
  async createContentVersion(
    contentType: string,
    contentId: string,
    contentData: any,
    actorId: string,
    actorIp?: string,
    tenantId?: string
  ) {
    try {
      // Validate content type
      const validContentTypes = ['exercise', 'module', 'lesson', 'quiz'];
      if (!validContentTypes.includes(contentType)) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Get latest version number
      const latestVersion = await this.repository.getLatestVersionNumber(contentType, contentId);
      const newVersionNumber = latestVersion + 1;

      const version = await this.repository.createContentVersion({
        content_type: contentType,
        content_id: contentId,
        version_number: newVersionNumber,
        content_data: contentData,
        created_by: actorId,
        tenant_id: tenantId,
      });

      // Audit log
      await this.auditService.logEvent({
        event_type: 'content_version_created',
        action: 'create_version',
        resource_type: contentType,
        resource_id: contentId,
        actor_id: actorId,
        actor_type: 'user',
        actor_ip: actorIp,
        severity: 'info',
        status: 'success',
        description: `Content version created: ${contentType} ${contentId} v${newVersionNumber}`,
        additional_data: {
          version_number: newVersionNumber,
          content_type: contentType,
        },
        tags: ['admin', 'content', 'version'],
      });

      return version;
    } catch (error) {
      log.error('Error in createContentVersion:', error);
      throw error;
    }
  }
}
