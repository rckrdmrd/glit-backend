/**
 * Users Repository
 *
 * Database operations for user management in admin module.
 */

import { Pool } from 'pg';
import {
  UserAdmin,
  UserActivity,
  UserFilters,
  UserUpdateData,
  UserSuspensionData,
  PaginationParams,
} from './admin.types';
import { log } from '../../shared/utils/logger';

export class UsersRepository {
  constructor(private pool: Pool) {}

  /**
   * Get All Users (Paginated)
   *
   * Retrieves list of all users with pagination and filtering.
   *
   * @param params - Pagination parameters
   * @param filters - Filter criteria
   * @returns Array of users and total count
   */
  async getAllUsers(
    params: PaginationParams,
    filters: UserFilters = {}
  ): Promise<{ users: UserAdmin[]; total: number }> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 50;
      const offset = (page - 1) * limit;
      const sortBy = params.sort_by || 'created_at';
      const order = params.order || 'desc';

      // Build WHERE clause
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filters.role) {
        conditions.push(`u.role = $${paramCount++}`);
        values.push(filters.role);
      }

      if (filters.status) {
        if (filters.status === 'active') {
          conditions.push(`p.is_active = true AND u.deleted_at IS NULL`);
        } else if (filters.status === 'suspended') {
          conditions.push(`us.suspension_until IS NOT NULL AND us.suspension_until > NOW()`);
        } else if (filters.status === 'banned') {
          conditions.push(`us.suspension_until IS NULL AND us.suspended_at IS NOT NULL`);
        } else if (filters.status === 'deleted') {
          conditions.push(`u.deleted_at IS NOT NULL`);
        }
      }

      if (filters.tenant_id) {
        conditions.push(`p.tenant_id = $${paramCount++}`);
        values.push(filters.tenant_id);
      }

      if (filters.search) {
        conditions.push(`(
          u.email ILIKE $${paramCount} OR
          p.full_name ILIKE $${paramCount} OR
          p.first_name ILIKE $${paramCount} OR
          p.last_name ILIKE $${paramCount} OR
          p.display_name ILIKE $${paramCount} OR
          p.student_id ILIKE $${paramCount}
        )`);
        values.push(`%${filters.search}%`);
        paramCount++;
      }

      if (filters.created_after) {
        conditions.push(`u.created_at >= $${paramCount++}`);
        values.push(filters.created_after);
      }

      if (filters.created_before) {
        conditions.push(`u.created_at <= $${paramCount++}`);
        values.push(filters.created_before);
      }

      if (filters.last_login_after) {
        conditions.push(`u.last_sign_in_at >= $${paramCount++}`);
        values.push(filters.last_login_after);
      }

      if (filters.last_login_before) {
        conditions.push(`u.last_sign_in_at <= $${paramCount++}`);
        values.push(filters.last_login_before);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Query users
      const query = `
        SELECT
          u.id,
          u.email,
          u.role,
          u.last_sign_in_at,
          u.created_at,
          u.updated_at,
          u.deleted_at,
          p.full_name,
          p.first_name,
          p.last_name,
          p.display_name,
          p.tenant_id,
          p.avatar_url,
          p.bio,
          p.phone,
          p.student_id,
          p.grade_level,
          p.is_active,
          t.name as tenant_name,
          us.ml_coins,
          us.total_xp,
          us.current_level,
          us.current_rank,
          us.total_exercises_completed,
          uss.reason as suspension_reason,
          uss.suspension_until,
          uss.suspended_by,
          uss.suspended_at,
          CASE
            WHEN u.deleted_at IS NOT NULL THEN 'deleted'
            WHEN uss.suspension_until IS NOT NULL AND uss.suspension_until > NOW() THEN 'suspended'
            WHEN uss.suspension_until IS NULL AND uss.suspended_at IS NOT NULL THEN 'banned'
            WHEN p.is_active = true THEN 'active'
            ELSE 'inactive'
          END as status
        FROM auth.users u
        LEFT JOIN auth_management.profiles p ON u.id = p.user_id
        LEFT JOIN auth_management.tenants t ON p.tenant_id = t.id
        LEFT JOIN gamification_system.user_stats us ON u.id = us.user_id
        LEFT JOIN auth_management.user_suspensions uss ON u.id = uss.user_id
        ${whereClause}
        ORDER BY ${sortBy} ${order.toUpperCase()}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM auth.users u
        LEFT JOIN auth_management.profiles p ON u.id = p.user_id
        LEFT JOIN auth_management.user_suspensions uss ON u.id = uss.user_id
        ${whereClause}
      `;

      const countResult = await this.pool.query(
        countQuery,
        values.slice(0, values.length - 2)
      );

      return {
        users: result.rows as UserAdmin[],
        total: parseInt(countResult.rows[0].total, 10),
      };
    } catch (error) {
      log.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get User By ID
   *
   * Retrieves detailed information about a specific user.
   *
   * @param userId - User ID
   * @returns User details
   */
  async getUserById(userId: string): Promise<UserAdmin | null> {
    try {
      const query = `
        SELECT
          u.id,
          u.email,
          u.role,
          u.last_sign_in_at,
          u.created_at,
          u.updated_at,
          u.deleted_at,
          p.full_name,
          p.first_name,
          p.last_name,
          p.display_name,
          p.tenant_id,
          p.avatar_url,
          p.bio,
          p.phone,
          p.student_id,
          p.grade_level,
          p.is_active,
          t.name as tenant_name,
          us.ml_coins,
          us.total_xp,
          us.current_level,
          us.current_rank,
          us.total_exercises_completed,
          uss.reason as suspension_reason,
          uss.suspension_until,
          uss.suspended_by,
          uss.suspended_at,
          CASE
            WHEN u.deleted_at IS NOT NULL THEN 'deleted'
            WHEN uss.suspension_until IS NOT NULL AND uss.suspension_until > NOW() THEN 'suspended'
            WHEN uss.suspension_until IS NULL AND uss.suspended_at IS NOT NULL THEN 'banned'
            WHEN p.is_active = true THEN 'active'
            ELSE 'inactive'
          END as status
        FROM auth.users u
        LEFT JOIN auth_management.profiles p ON u.id = p.user_id
        LEFT JOIN auth_management.tenants t ON p.tenant_id = t.id
        LEFT JOIN gamification_system.user_stats us ON u.id = us.user_id
        LEFT JOIN auth_management.user_suspensions uss ON u.id = uss.user_id
        WHERE u.id = $1
      `;

      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as UserAdmin;
    } catch (error) {
      log.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Update User
   *
   * Updates user information.
   *
   * @param userId - User ID
   * @param data - Update data
   * @returns Updated user
   */
  async updateUser(userId: string, data: UserUpdateData): Promise<UserAdmin> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update auth.users if email or role changed
      if (data.email || data.role) {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.email) {
          updateFields.push(`email = $${paramCount++}`);
          values.push(data.email);
        }

        if (data.role) {
          updateFields.push(`role = $${paramCount++}`);
          values.push(data.role);
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(userId);

        const userQuery = `
          UPDATE auth.users
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
        `;

        await client.query(userQuery, values);
      }

      // Update profile
      const profileFields: string[] = [];
      const profileValues: any[] = [];
      let profileParamCount = 1;

      if (data.full_name !== undefined) {
        profileFields.push(`full_name = $${profileParamCount++}`);
        profileValues.push(data.full_name);
      }

      if (data.first_name !== undefined) {
        profileFields.push(`first_name = $${profileParamCount++}`);
        profileValues.push(data.first_name);
      }

      if (data.last_name !== undefined) {
        profileFields.push(`last_name = $${profileParamCount++}`);
        profileValues.push(data.last_name);
      }

      if (data.display_name !== undefined) {
        profileFields.push(`display_name = $${profileParamCount++}`);
        profileValues.push(data.display_name);
      }

      if (data.tenant_id !== undefined) {
        profileFields.push(`tenant_id = $${profileParamCount++}`);
        profileValues.push(data.tenant_id);
      }

      if (data.phone !== undefined) {
        profileFields.push(`phone = $${profileParamCount++}`);
        profileValues.push(data.phone);
      }

      if (data.student_id !== undefined) {
        profileFields.push(`student_id = $${profileParamCount++}`);
        profileValues.push(data.student_id);
      }

      if (data.grade_level !== undefined) {
        profileFields.push(`grade_level = $${profileParamCount++}`);
        profileValues.push(data.grade_level);
      }

      if (data.is_active !== undefined) {
        profileFields.push(`is_active = $${profileParamCount++}`);
        profileValues.push(data.is_active);
      }

      if (data.avatar_url !== undefined) {
        profileFields.push(`avatar_url = $${profileParamCount++}`);
        profileValues.push(data.avatar_url);
      }

      if (data.bio !== undefined) {
        profileFields.push(`bio = $${profileParamCount++}`);
        profileValues.push(data.bio);
      }

      if (profileFields.length > 0) {
        profileFields.push(`updated_at = NOW()`);
        profileValues.push(userId);

        const profileQuery = `
          UPDATE auth_management.profiles
          SET ${profileFields.join(', ')}
          WHERE user_id = $${profileParamCount}
        `;

        await client.query(profileQuery, profileValues);
      }

      await client.query('COMMIT');

      // Fetch and return updated user
      const updatedUser = await this.getUserById(userId);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      return updatedUser;
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error updating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete User (Soft Delete)
   *
   * Soft deletes a user by setting deleted_at timestamp.
   *
   * @param userId - User ID
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE auth.users
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `;

      await this.pool.query(query, [userId]);
    } catch (error) {
      log.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Suspend User
   *
   * Suspends a user account for a specified duration.
   *
   * @param userId - User ID
   * @param data - Suspension data
   */
  async suspendUser(userId: string, data: UserSuspensionData): Promise<void> {
    try {
      const suspensionUntil = data.duration_days
        ? new Date(Date.now() + data.duration_days * 24 * 60 * 60 * 1000)
        : null;

      // Check if suspension record exists
      const checkQuery = `
        SELECT id FROM auth_management.user_suspensions WHERE user_id = $1
      `;

      const checkResult = await this.pool.query(checkQuery, [userId]);

      if (checkResult.rows.length > 0) {
        // Update existing suspension
        const updateQuery = `
          UPDATE auth_management.user_suspensions
          SET
            reason = $1,
            suspension_until = $2,
            suspended_by = $3,
            suspended_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $4
        `;

        await this.pool.query(updateQuery, [
          data.reason,
          suspensionUntil,
          data.suspended_by,
          userId,
        ]);
      } else {
        // Create new suspension
        const insertQuery = `
          INSERT INTO auth_management.user_suspensions (
            id, user_id, reason, suspension_until, suspended_by, suspended_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, NOW()
          )
        `;

        await this.pool.query(insertQuery, [
          userId,
          data.reason,
          suspensionUntil,
          data.suspended_by,
        ]);
      }

      // Deactivate user profile
      await this.pool.query(
        `UPDATE auth_management.profiles SET is_active = false WHERE user_id = $1`,
        [userId]
      );
    } catch (error) {
      log.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Unsuspend User
   *
   * Removes suspension from a user account.
   *
   * @param userId - User ID
   */
  async unsuspendUser(userId: string): Promise<void> {
    try {
      // Remove suspension
      const deleteQuery = `
        DELETE FROM auth_management.user_suspensions
        WHERE user_id = $1
      `;

      await this.pool.query(deleteQuery, [userId]);

      // Reactivate user profile
      await this.pool.query(
        `UPDATE auth_management.profiles SET is_active = true WHERE user_id = $1`,
        [userId]
      );
    } catch (error) {
      log.error('Error unsuspending user:', error);
      throw error;
    }
  }

  /**
   * Force Password Reset
   *
   * Generates a password reset token for a user.
   *
   * @param userId - User ID
   * @returns Reset token
   */
  async forcePasswordReset(userId: string): Promise<string> {
    try {
      // Generate random token
      const token = this.generateResetToken();

      const query = `
        UPDATE auth.users
        SET
          recovery_token = $1,
          recovery_sent_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING recovery_token
      `;

      const result = await this.pool.query(query, [token, userId]);

      return result.rows[0].recovery_token;
    } catch (error) {
      log.error('Error forcing password reset:', error);
      throw error;
    }
  }

  /**
   * Get User Activity Log
   *
   * Retrieves recent activity for a user.
   *
   * @param userId - User ID
   * @param limit - Maximum number of entries
   * @returns Activity log entries
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      const query = `
        SELECT
          id,
          user_id,
          activity_type,
          description,
          metadata,
          ip_address,
          user_agent,
          created_at
        FROM audit_logging.user_activity
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [userId, limit]);

      return result.rows as UserActivity[];
    } catch (error) {
      log.error('Error getting user activity:', error);
      throw error;
    }
  }

  /**
   * Generate Reset Token
   *
   * Generates a secure random token for password reset.
   *
   * @returns Reset token
   */
  private generateResetToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
