/**
 * Users Service
 *
 * Business logic for user management in admin module.
 */

import { Pool } from 'pg';
import { UsersRepository } from './users.repository';
import { AuditService } from './audit.service';
import {
  UserAdmin,
  UserActivity,
  UserFilters,
  UserUpdateData,
  UserSuspensionData,
  PaginationParams,
  UserExportData,
  PasswordResetRequest,
} from './admin.types';
import { log } from '../../shared/utils/logger';

export class UsersService {
  private usersRepository: UsersRepository;
  private auditService: AuditService;

  constructor(private pool: Pool) {
    this.usersRepository = new UsersRepository(pool);
    this.auditService = new AuditService(pool);
  }

  /**
   * Get All Users
   *
   * Retrieves paginated list of users with filtering.
   * Logs admin action for compliance.
   *
   * @param adminId - Admin performing the action
   * @param params - Pagination parameters
   * @param filters - Filter criteria
   * @returns Paginated users
   */
  async getAllUsers(
    adminId: string,
    params: PaginationParams,
    filters: UserFilters = {}
  ): Promise<{ users: UserAdmin[]; total: number }> {
    try {
      const result = await this.usersRepository.getAllUsers(params, filters);

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'list_users',
        resource_type: 'users',
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: `Admin listed users (page: ${params.page}, limit: ${params.limit})`,
        additional_data: {
          filters,
          total_results: result.total,
        },
      });

      return result;
    } catch (error) {
      log.error('Error in getAllUsers service:', error);
      throw error;
    }
  }

  /**
   * Get User Details
   *
   * Retrieves detailed information about a specific user.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID to retrieve
   * @returns User details
   */
  async getUserById(adminId: string, userId: string): Promise<UserAdmin | null> {
    try {
      const user = await this.usersRepository.getUserById(userId);

      if (user) {
        await this.auditService.logEvent({
          event_type: 'admin_action',
          action: 'view_user_details',
          resource_type: 'user',
          resource_id: userId,
          actor_id: adminId,
          actor_type: 'system',
          severity: 'info',
          status: 'success',
          description: `Admin viewed user details for ${user.email}`,
        });
      }

      return user;
    } catch (error) {
      log.error('Error in getUserById service:', error);
      throw error;
    }
  }

  /**
   * Update User
   *
   * Updates user information with validation and audit logging.
   * Prevents admins from demoting themselves.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID to update
   * @param data - Update data
   * @returns Updated user
   */
  async updateUser(
    adminId: string,
    userId: string,
    data: UserUpdateData
  ): Promise<UserAdmin> {
    try {
      // Get current user state
      const currentUser = await this.usersRepository.getUserById(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Prevent admin from changing their own role
      if (userId === adminId && data.role && data.role !== currentUser.role) {
        throw new Error('Cannot change your own role');
      }

      // Validate email uniqueness if changing
      if (data.email && data.email !== currentUser.email) {
        await this.validateEmailUnique(data.email);
      }

      // Validate tenant exists if changing
      if (data.tenant_id && data.tenant_id !== currentUser.tenant_id) {
        await this.validateTenantExists(data.tenant_id);
      }

      // Update user
      const updatedUser = await this.usersRepository.updateUser(userId, data);

      // Log admin action with before/after state
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'update_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: `Admin updated user ${currentUser.email}`,
        additional_data: {
          before: this.extractRelevantUserFields(currentUser),
          after: this.extractRelevantUserFields(updatedUser),
          changes: data,
        },
      });

      // TODO: Send notification to user if email changed or role changed
      if (data.email && data.email !== currentUser.email) {
        log.info(`User email changed from ${currentUser.email} to ${data.email}`);
        // await this.sendEmailChangeNotification(userId, data.email);
      }

      if (data.role && data.role !== currentUser.role) {
        log.info(`User role changed from ${currentUser.role} to ${data.role}`);
        // await this.sendRoleChangeNotification(userId, data.role);
      }

      return updatedUser;
    } catch (error) {
      log.error('Error in updateUser service:', error);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'update_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'error',
        status: 'failure',
        description: `Admin failed to update user`,
        additional_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempted_changes: data,
        },
      });

      throw error;
    }
  }

  /**
   * Delete User
   *
   * Soft deletes a user account.
   * Prevents admin from deleting themselves.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID to delete
   */
  async deleteUser(adminId: string, userId: string): Promise<void> {
    try {
      // Prevent admin self-deletion
      if (userId === adminId) {
        throw new Error('Cannot delete your own account');
      }

      // Get user details for logging
      const user = await this.usersRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Soft delete user
      await this.usersRepository.deleteUser(userId);

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'delete_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'warning',
        status: 'success',
        description: `Admin deleted user ${user.email}`,
        additional_data: {
          deleted_user: this.extractRelevantUserFields(user),
        },
      });

      log.info(`User ${user.email} (${userId}) soft deleted by admin ${adminId}`);

      // TODO: Send notification to user about account deletion
      // await this.sendAccountDeletionNotification(userId);
    } catch (error) {
      log.error('Error in deleteUser service:', error);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'delete_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'error',
        status: 'failure',
        description: `Admin failed to delete user`,
        additional_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Suspend User
   *
   * Suspends a user account for a specified duration or indefinitely.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID to suspend
   * @param data - Suspension data
   */
  async suspendUser(
    adminId: string,
    userId: string,
    data: Omit<UserSuspensionData, 'suspended_by'>
  ): Promise<void> {
    try {
      // Prevent admin self-suspension
      if (userId === adminId) {
        throw new Error('Cannot suspend your own account');
      }

      // Get user details
      const user = await this.usersRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Suspend user
      await this.usersRepository.suspendUser(userId, {
        ...data,
        suspended_by: adminId,
      });

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'suspend_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'warning',
        status: 'success',
        description: `Admin suspended user ${user.email}`,
        additional_data: {
          reason: data.reason,
          duration_days: data.duration_days,
          suspension_type: data.duration_days ? 'temporary' : 'permanent',
        },
      });

      log.info(
        `User ${user.email} suspended by admin ${adminId} for ${data.duration_days || 'indefinite'} days`
      );

      // TODO: Send notification to user about suspension
      // await this.sendSuspensionNotification(userId, data);
    } catch (error) {
      log.error('Error in suspendUser service:', error);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'suspend_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'error',
        status: 'failure',
        description: `Admin failed to suspend user`,
        additional_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempted_suspension: data,
        },
      });

      throw error;
    }
  }

  /**
   * Unsuspend User
   *
   * Removes suspension from a user account.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID to unsuspend
   */
  async unsuspendUser(adminId: string, userId: string): Promise<void> {
    try {
      // Get user details
      const user = await this.usersRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Unsuspend user
      await this.usersRepository.unsuspendUser(userId);

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'unsuspend_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: `Admin unsuspended user ${user.email}`,
      });

      log.info(`User ${user.email} unsuspended by admin ${adminId}`);

      // TODO: Send notification to user about unsuspension
      // await this.sendUnsuspensionNotification(userId);
    } catch (error) {
      log.error('Error in unsuspendUser service:', error);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'unsuspend_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'error',
        status: 'failure',
        description: `Admin failed to unsuspend user`,
        additional_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Force Password Reset
   *
   * Forces a password reset for a user account.
   *
   * @param adminId - Admin performing the action
   * @param request - Password reset request
   * @returns Reset token
   */
  async forcePasswordReset(
    adminId: string,
    request: Omit<PasswordResetRequest, 'initiated_by'>
  ): Promise<string> {
    try {
      // Get user details
      const user = await this.usersRepository.getUserById(request.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate reset token
      const resetToken = await this.usersRepository.forcePasswordReset(request.user_id);

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'force_password_reset',
        resource_type: 'user',
        resource_id: request.user_id,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'warning',
        status: 'success',
        description: `Admin forced password reset for ${user.email}`,
        additional_data: {
          reason: request.reason,
          notify_user: request.notify_user,
        },
      });

      log.info(`Password reset forced for user ${user.email} by admin ${adminId}`);

      // TODO: Send password reset email to user
      if (request.notify_user !== false) {
        // await this.sendPasswordResetEmail(request.user_id, resetToken);
      }

      return resetToken;
    } catch (error) {
      log.error('Error in forcePasswordReset service:', error);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'force_password_reset',
        resource_type: 'user',
        resource_id: request.user_id,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'error',
        status: 'failure',
        description: `Admin failed to force password reset`,
        additional_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Get User Activity
   *
   * Retrieves activity log for a user.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID
   * @param limit - Maximum number of entries
   * @returns Activity log entries
   */
  async getUserActivity(
    adminId: string,
    userId: string,
    limit: number = 50
  ): Promise<UserActivity[]> {
    try {
      const activities = await this.usersRepository.getUserActivity(userId, limit);

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'view_user_activity',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: `Admin viewed activity log for user`,
        additional_data: {
          limit,
          entries_returned: activities.length,
        },
      });

      return activities;
    } catch (error) {
      log.error('Error in getUserActivity service:', error);
      throw error;
    }
  }

  /**
   * Export User Data
   *
   * Exports all user data for GDPR compliance.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID to export
   * @returns Complete user data export
   */
  async exportUserData(adminId: string, userId: string): Promise<UserExportData> {
    try {
      // Get user details
      const user = await this.usersRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get additional data
      const [activity, stats, achievements, progress, transactions] = await Promise.all([
        this.usersRepository.getUserActivity(userId, 1000),
        this.getUserStats(userId),
        this.getUserAchievements(userId),
        this.getUserProgress(userId),
        this.getUserTransactions(userId),
      ]);

      const exportData: UserExportData = {
        user,
        profile: user,
        stats,
        achievements,
        progress,
        transactions,
        activity_log: activity,
        generated_at: new Date(),
      };

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'export_user_data',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: `Admin exported user data for ${user.email}`,
      });

      return exportData;
    } catch (error) {
      log.error('Error in exportUserData service:', error);
      throw error;
    }
  }

  /**
   * Helper: Validate Email Unique
   */
  private async validateEmailUnique(email: string): Promise<void> {
    const result = await this.pool.query(
      'SELECT id FROM auth.users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (result.rows.length > 0) {
      throw new Error('Email already in use');
    }
  }

  /**
   * Helper: Validate Tenant Exists
   */
  private async validateTenantExists(tenantId: string): Promise<void> {
    const result = await this.pool.query(
      'SELECT id FROM auth_management.tenants WHERE id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }
  }

  /**
   * Helper: Extract Relevant User Fields
   */
  private extractRelevantUserFields(user: UserAdmin): Record<string, any> {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      tenant_id: user.tenant_id,
      is_active: user.is_active,
      status: user.status,
    };
  }

  /**
   * Helper: Get User Stats
   */
  private async getUserStats(userId: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM gamification_system.user_stats WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || {};
  }

  /**
   * Helper: Get User Achievements
   */
  private async getUserAchievements(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM gamification_system.user_achievements WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  }

  /**
   * Helper: Get User Progress
   */
  private async getUserProgress(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM educational_content.user_progress WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  }

  /**
   * Activate User
   *
   * Activates a user account by setting is_active to true.
   * Includes validation and comprehensive audit logging.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID to activate
   * @param reason - Optional reason for activation
   * @returns Updated user
   */
  async activateUser(
    adminId: string,
    userId: string,
    reason?: string
  ): Promise<UserAdmin> {
    try {
      // Get user details before activation
      const user = await this.usersRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already active
      if (user.is_active) {
        throw new Error('User is already active');
      }

      // Activate user
      await this.usersRepository.activateUser(userId);

      // Get updated user
      const updatedUser = await this.usersRepository.getUserById(userId);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'activate_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: `Admin activated user ${user.email}`,
        additional_data: {
          reason: reason || 'No reason provided',
          previous_status: user.status,
          previous_is_active: user.is_active,
          new_is_active: true,
        },
      });

      log.info(`User ${user.email} (${userId}) activated by admin ${adminId}`);

      return updatedUser;
    } catch (error) {
      log.error('Error in activateUser service:', error);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'activate_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'error',
        status: 'failure',
        description: `Admin failed to activate user`,
        additional_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          reason: reason || 'No reason provided',
        },
      });

      throw error;
    }
  }

  /**
   * Deactivate User
   *
   * Deactivates a user account by setting is_active to false.
   * Prevents admin from deactivating themselves.
   * Includes comprehensive audit logging.
   *
   * @param adminId - Admin performing the action
   * @param userId - User ID to deactivate
   * @param reason - Reason for deactivation (required)
   * @returns Updated user
   */
  async deactivateUser(
    adminId: string,
    userId: string,
    reason: string
  ): Promise<UserAdmin> {
    try {
      // Prevent admin self-deactivation
      if (userId === adminId) {
        throw new Error('Cannot deactivate your own account');
      }

      // Get user details before deactivation
      const user = await this.usersRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already inactive
      if (!user.is_active) {
        throw new Error('User is already inactive');
      }

      // Deactivate user
      await this.usersRepository.deactivateUser(userId);

      // Get updated user
      const updatedUser = await this.usersRepository.getUserById(userId);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      // Log admin action
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'deactivate_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'warning',
        status: 'success',
        description: `Admin deactivated user ${user.email}`,
        additional_data: {
          reason,
          previous_status: user.status,
          previous_is_active: user.is_active,
          new_is_active: false,
          user_details: this.extractRelevantUserFields(user),
        },
      });

      log.info(`User ${user.email} (${userId}) deactivated by admin ${adminId}. Reason: ${reason}`);

      // TODO: Send notification to user about account deactivation
      // await this.sendAccountDeactivationNotification(userId, reason);

      return updatedUser;
    } catch (error) {
      log.error('Error in deactivateUser service:', error);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'deactivate_user',
        resource_type: 'user',
        resource_id: userId,
        actor_id: adminId,
        actor_type: 'system',
        severity: 'error',
        status: 'failure',
        description: `Admin failed to deactivate user`,
        additional_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          reason,
        },
      });

      throw error;
    }
  }

  /**
   * Helper: Get User Transactions
   */
  private async getUserTransactions(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM gamification_system.ml_coin_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }
}
