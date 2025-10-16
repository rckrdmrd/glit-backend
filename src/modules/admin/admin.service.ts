/**
 * Admin Service
 *
 * Business logic for general admin operations and dashboard.
 */

import { Pool } from 'pg';
import { AdminRepository } from './admin.repository';
import { AuditService } from './audit.service';
import { DashboardStats } from './admin.types';
import { log } from '../../shared/utils/logger';

export class AdminService {
  private adminRepository: AdminRepository;
  private auditService: AuditService;

  constructor(private pool: Pool) {
    this.adminRepository = new AdminRepository(pool);
    this.auditService = new AuditService(pool);
  }

  /**
   * Get Dashboard Statistics
   *
   * Retrieves overview statistics for admin dashboard.
   *
   * @param adminId - Admin requesting the data
   * @returns Dashboard statistics
   */
  async getDashboardStats(adminId: string): Promise<DashboardStats> {
    try {
      const stats = await this.adminRepository.getDashboardStats();

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'view_dashboard',
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: 'Admin viewed dashboard statistics',
      });

      return stats;
    } catch (error) {
      log.error('Error in getDashboardStats service:', error);
      throw error;
    }
  }

  /**
   * Get User Analytics
   *
   * Retrieves comprehensive user analytics.
   *
   * @param adminId - Admin requesting the data
   * @returns User analytics
   */
  async getUserAnalytics(adminId: string): Promise<{
    count_by_role: Record<string, number>;
    growth: Array<{ date: string; count: number }>;
    active_users: {
      last_24h: number;
      last_7d: number;
      last_30d: number;
    };
  }> {
    try {
      const [countByRole, growth, activeUsers] = await Promise.all([
        this.adminRepository.getUserCountByRole(),
        this.adminRepository.getUserGrowth(30),
        this.adminRepository.getActiveUsersStats(),
      ]);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'view_user_analytics',
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: 'Admin viewed user analytics',
      });

      return {
        count_by_role: countByRole,
        growth,
        active_users: activeUsers,
      };
    } catch (error) {
      log.error('Error in getUserAnalytics service:', error);
      throw error;
    }
  }

  /**
   * Get Organization Analytics
   *
   * Retrieves organization statistics and rankings.
   *
   * @param adminId - Admin requesting the data
   * @returns Organization analytics
   */
  async getOrganizationAnalytics(adminId: string): Promise<{
    top_organizations: Array<{
      id: string;
      name: string;
      user_count: number;
      active_user_count: number;
    }>;
  }> {
    try {
      const topOrganizations = await this.adminRepository.getTopOrganizations(10);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'view_organization_analytics',
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: 'Admin viewed organization analytics',
      });

      return {
        top_organizations: topOrganizations,
      };
    } catch (error) {
      log.error('Error in getOrganizationAnalytics service:', error);
      throw error;
    }
  }

  /**
   * Get System Statistics
   *
   * Retrieves system-wide statistics.
   *
   * @param adminId - Admin requesting the data
   * @returns System statistics
   */
  async getSystemStatistics(adminId: string): Promise<{
    total_exercises: number;
    total_exercises_completed: number;
    total_achievements: number;
    total_achievements_unlocked: number;
    total_ml_coins_earned: number;
    total_xp_earned: number;
  }> {
    try {
      const stats = await this.adminRepository.getSystemStats();

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'view_system_statistics',
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: 'Admin viewed system statistics',
      });

      return stats;
    } catch (error) {
      log.error('Error in getSystemStatistics service:', error);
      throw error;
    }
  }

  /**
   * Get Admin Actions Log
   *
   * Retrieves audit trail of admin actions.
   *
   * @param adminId - Admin requesting the data
   * @param page - Page number
   * @param limit - Items per page
   * @param filters - Filter criteria
   * @returns Admin actions log
   */
  async getAdminActionsLog(
    adminId: string,
    page: number,
    limit: number,
    filters: {
      admin_id?: string;
      action?: string;
      target_type?: string;
      status?: string;
      date_from?: Date;
      date_to?: Date;
    } = {}
  ): Promise<{ actions: any[]; total: number }> {
    try {
      const result = await this.adminRepository.getAdminActions(page, limit, filters);

      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: 'view_admin_log',
        actor_id: adminId,
        actor_type: 'system',
        severity: 'info',
        status: 'success',
        description: 'Admin viewed admin actions log',
        additional_data: {
          filters,
          page,
          limit,
        },
      });

      return result;
    } catch (error) {
      log.error('Error in getAdminActionsLog service:', error);
      throw error;
    }
  }

  /**
   * Validate Admin Permissions
   *
   * Checks if an admin has specific permissions.
   *
   * @param adminId - Admin ID
   * @param requiredRole - Required role
   * @returns True if admin has permission
   */
  async validateAdminPermissions(
    adminId: string,
    requiredRole: 'super_admin' | 'admin_teacher' = 'super_admin'
  ): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT role FROM auth.users WHERE id = $1 AND deleted_at IS NULL',
        [adminId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const userRole = result.rows[0].role;

      // Super admin has all permissions
      if (userRole === 'super_admin') {
        return true;
      }

      // Check if user has required role
      return userRole === requiredRole;
    } catch (error) {
      log.error('Error validating admin permissions:', error);
      return false;
    }
  }

  /**
   * Check if Admin Can Modify User
   *
   * Validates that an admin can modify a specific user.
   * Prevents admins from modifying themselves in certain ways.
   *
   * @param adminId - Admin performing action
   * @param targetUserId - User being modified
   * @param action - Action being performed
   * @returns True if allowed
   */
  async canAdminModifyUser(
    adminId: string,
    targetUserId: string,
    action: 'update' | 'delete' | 'suspend'
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Admin cannot perform these actions on themselves
      if (adminId === targetUserId) {
        const selfRestrictedActions = ['delete', 'suspend'];
        if (selfRestrictedActions.includes(action)) {
          return {
            allowed: false,
            reason: `Cannot ${action} your own account`,
          };
        }
      }

      // Check if target user is a super admin
      const targetResult = await this.pool.query(
        'SELECT role FROM auth.users WHERE id = $1',
        [targetUserId]
      );

      if (targetResult.rows.length === 0) {
        return { allowed: false, reason: 'User not found' };
      }

      const targetRole = targetResult.rows[0].role;

      // Only super admins can modify other super admins
      if (targetRole === 'super_admin' && adminId !== targetUserId) {
        const adminResult = await this.pool.query(
          'SELECT role FROM auth.users WHERE id = $1',
          [adminId]
        );

        if (adminResult.rows[0].role !== 'super_admin') {
          return {
            allowed: false,
            reason: 'Only super admins can modify other super admins',
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      log.error('Error checking admin modify permissions:', error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Log Admin Action
   *
   * Logs an admin action to the audit trail.
   *
   * @param data - Action data
   */
  async logAdminAction(data: {
    adminId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    description: string;
    details?: Record<string, any>;
    ipAddress?: string;
    status?: 'success' | 'failure';
  }): Promise<void> {
    try {
      await this.auditService.logEvent({
        event_type: 'admin_action',
        action: data.action,
        resource_type: data.targetType,
        resource_id: data.targetId,
        actor_id: data.adminId,
        actor_type: 'system',
        actor_ip: data.ipAddress,
        severity: data.status === 'failure' ? 'error' : 'info',
        status: data.status || 'success',
        description: data.description,
        additional_data: data.details,
      });
    } catch (error) {
      log.error('Error logging admin action:', error);
      // Don't throw - logging failures shouldn't break the main operation
    }
  }
}
