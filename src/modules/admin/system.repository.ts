/**
 * System Repository
 *
 * Database access layer for system management operations.
 */

import { Pool } from 'pg';
import { log } from '../../shared/utils/logger';

export interface SystemUser {
  id: string;
  email: string;
  display_name?: string;
  full_name?: string;
  role: string;
  status: string;
  tenant_id?: string;
  last_sign_in_at?: Date;
  created_at: Date;
}

export interface SystemLog {
  id: string;
  log_level: string;
  message: string;
  module_name?: string;
  user_id?: string;
  ip_address?: string;
  exception_message?: string;
  created_at: Date;
}

export class SystemRepository {
  constructor(private pool: Pool) {}

  /**
   * Get all users with pagination and filters
   */
  async getUsers(filters: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    tenant_id?: string;
    search?: string;
  }): Promise<{ users: SystemUser[]; total: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.role) {
        conditions.push(`role = $${paramIndex++}`);
        values.push(filters.role);
      }

      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(filters.status);
      }

      if (filters.tenant_id) {
        conditions.push(`tenant_id = $${paramIndex++}`);
        values.push(filters.tenant_id);
      }

      if (filters.search) {
        conditions.push(`(email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total FROM auth_management.profiles ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // Get users
      values.push(limit, offset);
      const result = await this.pool.query<SystemUser>(
        `SELECT
           id,
           email,
           display_name,
           full_name,
           role,
           status,
           tenant_id,
           last_sign_in_at,
           created_at
         FROM auth_management.profiles
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        values
      );

      return { users: result.rows, total };
    } catch (error) {
      log.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<SystemUser | null> {
    try {
      const result = await this.pool.query<SystemUser>(
        'SELECT * FROM auth_management.profiles WHERE id = $1',
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE auth_management.profiles
         SET role = $1, updated_at = NOW()
         WHERE id = $2`,
        [role, userId]
      );

      log.info(`User role updated: ${userId} -> ${role}`);
    } catch (error) {
      log.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE auth_management.profiles
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, userId]
      );

      log.info(`User status updated: ${userId} -> ${status}`);
    } catch (error) {
      log.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Count users by role
   */
  async countUsersByRole(role: string): Promise<number> {
    try {
      const result = await this.pool.query(
        'SELECT COUNT(*) as count FROM auth_management.profiles WHERE role = $1',
        [role]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      log.error('Error counting users by role:', error);
      throw error;
    }
  }

  /**
   * Get system logs
   */
  async getSystemLogs(filters: {
    limit?: number;
    log_level?: string;
    start_date?: Date;
    end_date?: Date;
  }): Promise<SystemLog[]> {
    try {
      const limit = filters.limit || 1000;
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.log_level) {
        conditions.push(`log_level = $${paramIndex++}`);
        values.push(filters.log_level);
      }

      if (filters.start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(filters.start_date);
      }

      if (filters.end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(filters.end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      values.push(limit);
      const result = await this.pool.query<SystemLog>(
        `SELECT
           id,
           log_level,
           message,
           module_name,
           user_id,
           ip_address,
           exception_message,
           created_at
         FROM audit_logging.system_logs
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex}`,
        values
      );

      return result.rows;
    } catch (error) {
      log.error('Error fetching system logs:', error);
      // Return empty array if table doesn't exist
      return [];
    }
  }

  /**
   * Get or create maintenance mode setting
   */
  async getMaintenanceMode(): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT value FROM system_configuration.settings
         WHERE key = 'maintenance_mode'
         LIMIT 1`
      ).catch(() => ({ rows: [] }));

      if (result.rows.length > 0) {
        return result.rows[0].value === 'true' || result.rows[0].value === true;
      }

      return false;
    } catch (error) {
      log.error('Error fetching maintenance mode:', error);
      return false;
    }
  }

  /**
   * Set maintenance mode
   */
  async setMaintenanceMode(enabled: boolean): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO system_configuration.settings (key, value, updated_at)
         VALUES ('maintenance_mode', $1, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = $1, updated_at = NOW()`,
        [enabled.toString()]
      ).catch(() => {
        log.warn('Settings table not found, maintenance mode not persisted');
      });

      log.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      log.error('Error setting maintenance mode:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(days: number = 30): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT
           DATE(created_at) as date,
           COUNT(*) as new_users,
           COUNT(DISTINCT tenant_id) as organizations
         FROM auth_management.profiles
         WHERE created_at > NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`
      );

      return result.rows;
    } catch (error) {
      log.error('Error fetching user analytics:', error);
      return [];
    }
  }
}
