/**
 * Organizations Service
 *
 * Business logic for organization/tenant management.
 */

import { Pool } from 'pg';
import { OrganizationsRepository, CreateOrganizationData, UpdateOrganizationData } from './organizations.repository';
import { AuditService } from './audit.service';
import { log } from '../../shared/utils/logger';

export class OrganizationsService {
  private repository: OrganizationsRepository;
  private auditService: AuditService;

  constructor(private pool: Pool) {
    this.repository = new OrganizationsRepository(pool);
    this.auditService = new AuditService(pool);
  }

  /**
   * Get all organizations
   */
  async getAll(filters: {
    page?: number;
    limit?: number;
    subscription_tier?: string;
    is_active?: boolean;
    search?: string;
  }) {
    try {
      return await this.repository.getAll(filters);
    } catch (error) {
      log.error('Error in getAll organizations:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getById(id: string) {
    try {
      const organization = await this.repository.getById(id);
      if (!organization) {
        throw new Error('Organization not found');
      }
      return organization;
    } catch (error) {
      log.error('Error in getById organization:', error);
      throw error;
    }
  }

  /**
   * Create organization
   */
  async create(data: CreateOrganizationData, actorId: string, actorIp?: string) {
    try {
      // Validate slug uniqueness
      const existing = await this.repository.getBySlug(data.slug);
      if (existing) {
        throw new Error('Organization slug already exists');
      }

      // Validate subscription tier limits
      this.validateSubscriptionLimits(data.subscription_tier || 'free', data.max_users, data.max_storage_gb);

      const organization = await this.repository.create(data);

      // Audit log
      await this.auditService.logOrganizationCreated(organization.id, organization, actorId, actorIp);

      return organization;
    } catch (error) {
      log.error('Error in create organization:', error);
      throw error;
    }
  }

  /**
   * Update organization
   */
  async update(id: string, data: UpdateOrganizationData, actorId: string, actorIp?: string) {
    try {
      const oldOrganization = await this.repository.getById(id);
      if (!oldOrganization) {
        throw new Error('Organization not found');
      }

      // Validate subscription tier limits if changing
      if (data.subscription_tier) {
        this.validateSubscriptionLimits(
          data.subscription_tier,
          data.max_users || oldOrganization.max_users,
          data.max_storage_gb || oldOrganization.max_storage_gb
        );
      }

      const updated = await this.repository.update(id, data);

      // Audit log
      await this.auditService.logOrganizationUpdated(id, oldOrganization, updated, actorId, actorIp);

      return updated;
    } catch (error) {
      log.error('Error in update organization:', error);
      throw error;
    }
  }

  /**
   * Delete organization (soft delete)
   */
  async delete(id: string, actorId: string, actorIp?: string) {
    try {
      const organization = await this.repository.getById(id);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check if organization has users
      const users = await this.repository.getUsers(id, 1, 1);
      if (users.total > 0) {
        log.warn(`Attempting to delete organization ${id} with ${users.total} users`);
      }

      await this.repository.delete(id);

      // Audit log
      await this.auditService.logOrganizationDeleted(id, organization, actorId, actorIp);
    } catch (error) {
      log.error('Error in delete organization:', error);
      throw error;
    }
  }

  /**
   * Get organization users
   */
  async getUsers(organizationId: string, page: number = 1, limit: number = 20) {
    try {
      const organization = await this.repository.getById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      return await this.repository.getUsers(organizationId, page, limit);
    } catch (error) {
      log.error('Error in getUsers:', error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    id: string,
    subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise',
    actorId: string,
    actorIp?: string
  ) {
    try {
      const organization = await this.repository.getById(id);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Get subscription limits
      const limits = this.getSubscriptionLimits(subscriptionTier);

      const updated = await this.repository.updateSubscription(
        id,
        subscriptionTier,
        limits.maxUsers,
        limits.maxStorageGb
      );

      // Audit log
      await this.auditService.logEvent({
        event_type: 'subscription_updated',
        action: 'update_subscription',
        resource_type: 'organization',
        resource_id: id,
        actor_id: actorId,
        actor_ip: actorIp,
        severity: 'info',
        status: 'success',
        description: `Subscription updated from ${organization.subscription_tier} to ${subscriptionTier}`,
        old_values: { subscription_tier: organization.subscription_tier },
        new_values: { subscription_tier: subscriptionTier },
        tags: ['admin', 'subscription', 'organization'],
      });

      return updated;
    } catch (error) {
      log.error('Error in updateSubscription:', error);
      throw error;
    }
  }

  /**
   * Update feature flags
   */
  async updateFeatureFlags(
    id: string,
    features: Record<string, boolean>,
    actorId: string,
    actorIp?: string
  ) {
    try {
      const organization = await this.repository.getById(id);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Validate features
      const validFeatures = [
        'ai_features',
        'social_features',
        'advanced_analytics',
        'custom_branding',
        'api_access',
        'gamification_enabled',
        'social_features_enabled',
        'analytics_enabled',
      ];

      Object.keys(features).forEach((feature) => {
        if (!validFeatures.includes(feature)) {
          throw new Error(`Invalid feature flag: ${feature}`);
        }
      });

      const oldFeatures = organization.settings?.features || {};
      const updated = await this.repository.updateFeatureFlags(id, features);

      // Audit log for each changed feature
      for (const [featureName, newValue] of Object.entries(features)) {
        const oldValue = oldFeatures[featureName] || false;
        if (oldValue !== newValue) {
          await this.auditService.logFeatureFlagChanged(
            id,
            featureName,
            oldValue,
            newValue,
            actorId,
            actorIp
          );
        }
      }

      return updated;
    } catch (error) {
      log.error('Error in updateFeatureFlags:', error);
      throw error;
    }
  }

  /**
   * Get organization statistics
   */
  async getStatistics(organizationId: string) {
    try {
      return await this.repository.getStatistics(organizationId);
    } catch (error) {
      log.error('Error in getStatistics:', error);
      throw error;
    }
  }

  /**
   * Get all organizations with statistics
   */
  async getAllWithStatistics() {
    try {
      return await this.repository.getAllStatistics();
    } catch (error) {
      log.error('Error in getAllWithStatistics:', error);
      throw error;
    }
  }

  /**
   * Validate subscription tier limits
   */
  private validateSubscriptionLimits(
    tier: string,
    maxUsers?: number,
    maxStorageGb?: number
  ): void {
    const limits = this.getSubscriptionLimits(tier);

    if (maxUsers && maxUsers > limits.maxUsers) {
      throw new Error(
        `Max users (${maxUsers}) exceeds limit for ${tier} tier (${limits.maxUsers})`
      );
    }

    if (maxStorageGb && maxStorageGb > limits.maxStorageGb) {
      throw new Error(
        `Max storage (${maxStorageGb}GB) exceeds limit for ${tier} tier (${limits.maxStorageGb}GB)`
      );
    }
  }

  /**
   * Get subscription tier limits
   */
  private getSubscriptionLimits(tier: string): { maxUsers: number; maxStorageGb: number } {
    const limits: Record<string, { maxUsers: number; maxStorageGb: number }> = {
      free: { maxUsers: 100, maxStorageGb: 5 },
      basic: { maxUsers: 500, maxStorageGb: 50 },
      professional: { maxUsers: 2000, maxStorageGb: 200 },
      enterprise: { maxUsers: 10000, maxStorageGb: 1000 },
    };

    return limits[tier] || limits.free;
  }
}
