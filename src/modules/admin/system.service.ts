/**
 * System Service
 *
 * Business logic for system management operations.
 */

import { Pool } from 'pg';
import { SystemRepository } from './system.repository';
import { HealthService } from './health.service';
import { AuditService } from './audit.service';
import { log } from '../../shared/utils/logger';

export class SystemService {
  private repository: SystemRepository;
  private healthService: HealthService;
  private auditService: AuditService;

  constructor(private pool: Pool) {
    this.repository = new SystemRepository(pool);
    this.healthService = new HealthService(pool);
    this.auditService = new AuditService(pool);
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    try {
      return await this.healthService.getSystemHealth();
    } catch (error) {
      log.error('Error in getSystemHealth:', error);
      throw error;
    }
  }

  /**
   * Get all users
   */
  async getUsers(filters: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    tenant_id?: string;
    search?: string;
  }) {
    try {
      return await this.repository.getUsers(filters);
    } catch (error) {
      log.error('Error in getUsers:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(
    userId: string,
    newRole: string,
    actorId: string,
    actorIp?: string
  ) {
    try {
      const user = await this.repository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate role
      const validRoles = ['student', 'admin_teacher', 'super_admin'];
      if (!validRoles.includes(newRole)) {
        throw new Error('Invalid role');
      }

      // Prevent downgrading the last super_admin
      if (user.role === 'super_admin' && newRole !== 'super_admin') {
        const superAdminCount = await this.repository.countUsersByRole('super_admin');
        if (superAdminCount <= 1) {
          throw new Error('Cannot downgrade the last super admin');
        }
      }

      const oldRole = user.role;
      await this.repository.updateUserRole(userId, newRole);

      // Audit log
      await this.auditService.logUserRoleChanged(userId, oldRole, newRole, actorId, actorIp);

      return { message: 'User role updated successfully' };
    } catch (error) {
      log.error('Error in updateUserRole:', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(
    userId: string,
    newStatus: string,
    actorId: string,
    actorIp?: string
  ) {
    try {
      const user = await this.repository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate status
      const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid status');
      }

      const oldStatus = user.status;
      await this.repository.updateUserStatus(userId, newStatus);

      // Audit log
      await this.auditService.logUserStatusChanged(userId, oldStatus, newStatus, actorId, actorIp);

      return { message: 'User status updated successfully' };
    } catch (error) {
      log.error('Error in updateUserStatus:', error);
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
  }) {
    try {
      return await this.repository.getSystemLogs(filters);
    } catch (error) {
      log.error('Error in getSystemLogs:', error);
      throw error;
    }
  }

  /**
   * Toggle maintenance mode
   */
  async toggleMaintenanceMode(
    enabled: boolean,
    actorId: string,
    actorIp?: string
  ) {
    try {
      const currentMode = await this.repository.getMaintenanceMode();

      await this.repository.setMaintenanceMode(enabled);

      // Audit log
      await this.auditService.logSystemConfigChanged(
        'maintenance_mode',
        currentMode,
        enabled,
        actorId,
        actorIp
      );

      return {
        message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
        maintenance_mode: enabled,
      };
    } catch (error) {
      log.error('Error in toggleMaintenanceMode:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStatistics() {
    try {
      const [health, analytics, dbStats] = await Promise.all([
        this.healthService.getSystemHealth(),
        this.repository.getUserAnalytics(30),
        this.healthService.getDatabaseStats(),
      ]);

      return {
        health,
        user_analytics: analytics,
        database: dbStats,
      };
    } catch (error) {
      log.error('Error in getSystemStatistics:', error);
      throw error;
    }
  }
}
