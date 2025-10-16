/**
 * Organizations Repository
 *
 * Database access layer for organization/tenant management.
 */

import { Pool } from 'pg';
import { log } from '../../shared/utils/logger';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  subscription_tier: 'free' | 'basic' | 'professional' | 'enterprise';
  max_users: number;
  max_storage_gb: number;
  is_active: boolean;
  trial_ends_at?: Date;
  settings: any;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrganizationData {
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  subscription_tier?: 'free' | 'basic' | 'professional' | 'enterprise';
  max_users?: number;
  max_storage_gb?: number;
  settings?: any;
  metadata?: any;
}

export interface UpdateOrganizationData {
  name?: string;
  domain?: string;
  logo_url?: string;
  subscription_tier?: 'free' | 'basic' | 'professional' | 'enterprise';
  max_users?: number;
  max_storage_gb?: number;
  is_active?: boolean;
  trial_ends_at?: Date;
  settings?: any;
  metadata?: any;
}

export interface OrganizationStats {
  id: string;
  name: string;
  subscription_tier: string;
  total_users: number;
  active_users: number;
  total_classrooms: number;
  total_exercises: number;
  storage_used_mb: number;
}

export class OrganizationsRepository {
  constructor(private pool: Pool) {}

  /**
   * Get all organizations with pagination and filters
   */
  async getAll(filters: {
    page?: number;
    limit?: number;
    subscription_tier?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<{ organizations: Organization[]; total: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.subscription_tier) {
        conditions.push(`subscription_tier = $${paramIndex++}`);
        values.push(filters.subscription_tier);
      }

      if (filters.is_active !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        values.push(filters.is_active);
      }

      if (filters.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex})`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total FROM auth_management.tenants ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // Get organizations
      values.push(limit, offset);
      const result = await this.pool.query<Organization>(
        `SELECT * FROM auth_management.tenants
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        values
      );

      return { organizations: result.rows, total };
    } catch (error) {
      log.error('Error fetching organizations:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    try {
      const result = await this.pool.query<Organization>(
        'SELECT * FROM auth_management.tenants WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      log.error('Error fetching organization:', error);
      throw error;
    }
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    try {
      const result = await this.pool.query<Organization>(
        'SELECT * FROM auth_management.tenants WHERE slug = $1',
        [slug]
      );
      return result.rows[0] || null;
    } catch (error) {
      log.error('Error fetching organization by slug:', error);
      throw error;
    }
  }

  /**
   * Create new organization
   */
  async create(data: CreateOrganizationData): Promise<Organization> {
    try {
      const result = await this.pool.query<Organization>(
        `INSERT INTO auth_management.tenants (
          name,
          slug,
          domain,
          logo_url,
          subscription_tier,
          max_users,
          max_storage_gb,
          settings,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          data.name,
          data.slug,
          data.domain || null,
          data.logo_url || null,
          data.subscription_tier || 'free',
          data.max_users || 100,
          data.max_storage_gb || 5,
          data.settings || {},
          data.metadata || {},
        ]
      );

      log.info(`Organization created: ${data.name} (${result.rows[0].id})`);
      return result.rows[0];
    } catch (error) {
      log.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Update organization
   */
  async update(id: string, data: UpdateOrganizationData): Promise<Organization> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      const result = await this.pool.query<Organization>(
        `UPDATE auth_management.tenants
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Organization not found');
      }

      log.info(`Organization updated: ${id}`);
      return result.rows[0];
    } catch (error) {
      log.error('Error updating organization:', error);
      throw error;
    }
  }

  /**
   * Soft delete organization
   */
  async delete(id: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE auth_management.tenants
         SET is_active = false, updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      log.info(`Organization soft deleted: ${id}`);
    } catch (error) {
      log.error('Error deleting organization:', error);
      throw error;
    }
  }

  /**
   * Get organization users
   */
  async getUsers(organizationId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total
         FROM auth_management.profiles
         WHERE tenant_id = $1`,
        [organizationId]
      );
      const total = parseInt(countResult.rows[0].total);

      const result = await this.pool.query(
        `SELECT
           id,
           display_name,
           full_name,
           email,
           role,
           status,
           last_sign_in_at,
           created_at
         FROM auth_management.profiles
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [organizationId, limit, offset]
      );

      return {
        users: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      log.error('Error fetching organization users:', error);
      throw error;
    }
  }

  /**
   * Update organization subscription
   */
  async updateSubscription(
    id: string,
    subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise',
    maxUsers?: number,
    maxStorageGb?: number
  ): Promise<Organization> {
    try {
      const updates: any = { subscription_tier: subscriptionTier };

      if (maxUsers !== undefined) {
        updates.max_users = maxUsers;
      }

      if (maxStorageGb !== undefined) {
        updates.max_storage_gb = maxStorageGb;
      }

      return await this.update(id, updates);
    } catch (error) {
      log.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Update feature flags
   */
  async updateFeatureFlags(id: string, features: Record<string, boolean>): Promise<Organization> {
    try {
      const org = await this.getById(id);
      if (!org) {
        throw new Error('Organization not found');
      }

      const currentSettings = org.settings || {};
      const currentFeatures = currentSettings.features || {};

      const updatedSettings = {
        ...currentSettings,
        features: {
          ...currentFeatures,
          ...features,
        },
      };

      return await this.update(id, { settings: updatedSettings });
    } catch (error) {
      log.error('Error updating feature flags:', error);
      throw error;
    }
  }

  /**
   * Get organization statistics
   */
  async getStatistics(organizationId: string): Promise<OrganizationStats | null> {
    try {
      const result = await this.pool.query<OrganizationStats>(
        `SELECT
           o.id,
           o.name,
           o.subscription_tier,
           COUNT(DISTINCT p.id) as total_users,
           COUNT(DISTINCT CASE WHEN p.last_sign_in_at > NOW() - INTERVAL '7 days' THEN p.id END) as active_users,
           0 as total_classrooms,
           0 as total_exercises,
           0 as storage_used_mb
         FROM auth_management.tenants o
         LEFT JOIN auth_management.profiles p ON p.tenant_id = o.id
         WHERE o.id = $1
         GROUP BY o.id, o.name, o.subscription_tier`,
        [organizationId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error fetching organization statistics:', error);
      throw error;
    }
  }

  /**
   * Get all organizations statistics
   */
  async getAllStatistics(): Promise<OrganizationStats[]> {
    try {
      const result = await this.pool.query<OrganizationStats>(
        `SELECT
           o.id,
           o.name,
           o.subscription_tier,
           COUNT(DISTINCT p.id) as total_users,
           COUNT(DISTINCT CASE WHEN p.last_sign_in_at > NOW() - INTERVAL '7 days' THEN p.id END) as active_users,
           0 as total_classrooms,
           0 as total_exercises,
           0 as storage_used_mb
         FROM auth_management.tenants o
         LEFT JOIN auth_management.profiles p ON p.tenant_id = o.id
         WHERE o.is_active = true
         GROUP BY o.id, o.name, o.subscription_tier
         ORDER BY o.created_at DESC`
      );

      return result.rows;
    } catch (error) {
      log.error('Error fetching all organization statistics:', error);
      throw error;
    }
  }
}
