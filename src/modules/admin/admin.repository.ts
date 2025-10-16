/**
 * Admin Repository
 *
 * Additional database operations for admin dashboard and metrics.
 */

import { Pool } from 'pg';
import { DashboardStats, AdminAction } from './admin.types';
import { log } from '../../shared/utils/logger';

export class AdminRepository {
  constructor(private pool: Pool) {}

  /**
   * Get Dashboard Statistics
   *
   * Retrieves overview statistics for admin dashboard.
   *
   * @returns Dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get user statistics
      const userStatsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_users,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as users_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as users_this_week,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as users_this_month,
          COUNT(*) FILTER (WHERE last_sign_in_at >= CURRENT_DATE) as active_users_today
        FROM auth.users
      `;

      const userStats = await this.pool.query(userStatsQuery);

      // Get organization statistics
      const orgStatsQuery = `
        SELECT
          COUNT(*) as total_organizations,
          COUNT(*) FILTER (WHERE is_active = true) as active_organizations
        FROM auth_management.tenants
      `;

      const orgStats = await this.pool.query(orgStatsQuery);

      // Get flagged content statistics
      const contentStatsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as flagged_content_pending,
          COUNT(*) as flagged_content_total
        FROM content_management.flagged_content
      `;

      const contentStats = await this.pool.query(contentStatsQuery);

      // Get activity statistics
      const activityStatsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as exercises_completed_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as exercises_completed_this_week
        FROM educational_content.user_progress
        WHERE is_completed = true
      `;

      const activityStats = await this.pool.query(activityStatsQuery);

      // Calculate system health based on error rate
      const errorRateQuery = `
        SELECT
          COUNT(*) FILTER (WHERE level = 'error' OR level = 'fatal') as error_count,
          COUNT(*) as total_logs
        FROM audit_logging.system_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;

      const errorRateResult = await this.pool.query(errorRateQuery);
      const errorCount = parseInt(errorRateResult.rows[0].error_count, 10);
      const totalLogs = parseInt(errorRateResult.rows[0].total_logs, 10);
      const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;

      let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (errorRate > 10) {
        systemHealth = 'critical';
      } else if (errorRate > 5) {
        systemHealth = 'degraded';
      }

      return {
        total_users: parseInt(userStats.rows[0].total_users, 10),
        users_today: parseInt(userStats.rows[0].users_today, 10),
        users_this_week: parseInt(userStats.rows[0].users_this_week, 10),
        users_this_month: parseInt(userStats.rows[0].users_this_month, 10),
        active_users_today: parseInt(userStats.rows[0].active_users_today, 10),

        total_organizations: parseInt(orgStats.rows[0].total_organizations, 10),
        active_organizations: parseInt(orgStats.rows[0].active_organizations, 10),

        flagged_content_pending: parseInt(contentStats.rows[0].flagged_content_pending, 10),
        flagged_content_total: parseInt(contentStats.rows[0].flagged_content_total, 10),

        exercises_completed_today: parseInt(activityStats.rows[0].exercises_completed_today, 10),
        exercises_completed_this_week: parseInt(
          activityStats.rows[0].exercises_completed_this_week,
          10
        ),

        system_health: systemHealth,
        error_rate_24h: errorRate,

        generated_at: new Date(),
      };
    } catch (error) {
      log.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get Admin Actions Log
   *
   * Retrieves recent admin actions for audit trail.
   *
   * @param page - Page number
   * @param limit - Items per page
   * @param filters - Filter criteria
   * @returns Admin actions and total count
   */
  async getAdminActions(
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
  ): Promise<{ actions: AdminAction[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const conditions: string[] = ["event_type = 'admin_action'"];
      const values: any[] = [];
      let paramCount = 1;

      if (filters.admin_id) {
        conditions.push(`actor_id = $${paramCount++}`);
        values.push(filters.admin_id);
      }

      if (filters.action) {
        conditions.push(`action ILIKE $${paramCount++}`);
        values.push(`%${filters.action}%`);
      }

      if (filters.target_type) {
        conditions.push(`resource_type = $${paramCount++}`);
        values.push(filters.target_type);
      }

      if (filters.status) {
        conditions.push(`status = $${paramCount++}`);
        values.push(filters.status);
      }

      if (filters.date_from) {
        conditions.push(`created_at >= $${paramCount++}`);
        values.push(filters.date_from);
      }

      if (filters.date_to) {
        conditions.push(`created_at <= $${paramCount++}`);
        values.push(filters.date_to);
      }

      const whereClause = conditions.join(' AND ');

      // Query actions
      const query = `
        SELECT
          ale.id,
          ale.actor_id as admin_id,
          u.email as admin_email,
          p.full_name as admin_name,
          ale.action,
          ale.resource_type as target_type,
          ale.resource_id as target_id,
          ale.description,
          ale.additional_data as details,
          ale.actor_ip as ip_address,
          ale.actor_user_agent as user_agent,
          ale.status,
          ale.created_at as timestamp
        FROM audit_logging.audit_log_events ale
        LEFT JOIN auth.users u ON ale.actor_id = u.id
        LEFT JOIN auth_management.profiles p ON ale.actor_id = p.user_id
        WHERE ${whereClause}
        ORDER BY ale.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM audit_logging.audit_log_events
        WHERE ${whereClause}
      `;

      const countResult = await this.pool.query(
        countQuery,
        values.slice(0, values.length - 2)
      );

      return {
        actions: result.rows as AdminAction[],
        total: parseInt(countResult.rows[0].total, 10),
      };
    } catch (error) {
      log.error('Error getting admin actions:', error);
      throw error;
    }
  }

  /**
   * Get User Count by Role
   *
   * Returns count of users grouped by role.
   *
   * @returns User counts by role
   */
  async getUserCountByRole(): Promise<Record<string, number>> {
    try {
      const query = `
        SELECT role, COUNT(*) as count
        FROM auth.users
        WHERE deleted_at IS NULL
        GROUP BY role
      `;

      const result = await this.pool.query(query);

      const counts: Record<string, number> = {};
      result.rows.forEach((row) => {
        counts[row.role] = parseInt(row.count, 10);
      });

      return counts;
    } catch (error) {
      log.error('Error getting user count by role:', error);
      throw error;
    }
  }

  /**
   * Get User Growth Statistics
   *
   * Returns user registration counts over time.
   *
   * @param days - Number of days to look back
   * @returns Daily user counts
   */
  async getUserGrowth(
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> {
    try {
      const query = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM auth.users
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const result = await this.pool.query(query);

      return result.rows.map((row) => ({
        date: row.date,
        count: parseInt(row.count, 10),
      }));
    } catch (error) {
      log.error('Error getting user growth:', error);
      throw error;
    }
  }

  /**
   * Get Active Users Statistics
   *
   * Returns active user counts for different time periods.
   *
   * @returns Active user statistics
   */
  async getActiveUsersStats(): Promise<{
    last_24h: number;
    last_7d: number;
    last_30d: number;
  }> {
    try {
      const query = `
        SELECT
          COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '24 hours') as last_24h,
          COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '7 days') as last_7d,
          COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '30 days') as last_30d
        FROM auth.users
        WHERE deleted_at IS NULL
      `;

      const result = await this.pool.query(query);

      return {
        last_24h: parseInt(result.rows[0].last_24h, 10),
        last_7d: parseInt(result.rows[0].last_7d, 10),
        last_30d: parseInt(result.rows[0].last_30d, 10),
      };
    } catch (error) {
      log.error('Error getting active users stats:', error);
      throw error;
    }
  }

  /**
   * Get Top Organizations by User Count
   *
   * Returns organizations with most users.
   *
   * @param limit - Number of organizations to return
   * @returns Top organizations
   */
  async getTopOrganizations(
    limit: number = 10
  ): Promise<
    Array<{ id: string; name: string; user_count: number; active_user_count: number }>
  > {
    try {
      const query = `
        SELECT
          t.id,
          t.name,
          COUNT(p.id) as user_count,
          COUNT(p.id) FILTER (WHERE p.is_active = true) as active_user_count
        FROM auth_management.tenants t
        LEFT JOIN auth_management.profiles p ON t.id = p.tenant_id
        GROUP BY t.id, t.name
        ORDER BY user_count DESC
        LIMIT $1
      `;

      const result = await this.pool.query(query, [limit]);

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        user_count: parseInt(row.user_count, 10),
        active_user_count: parseInt(row.active_user_count, 10),
      }));
    } catch (error) {
      log.error('Error getting top organizations:', error);
      throw error;
    }
  }

  /**
   * Get System Statistics
   *
   * Returns various system-wide statistics.
   *
   * @returns System statistics
   */
  async getSystemStats(): Promise<{
    total_exercises: number;
    total_exercises_completed: number;
    total_achievements: number;
    total_achievements_unlocked: number;
    total_ml_coins_earned: number;
    total_xp_earned: number;
  }> {
    try {
      const query = `
        SELECT
          (SELECT COUNT(*) FROM educational_content.exercises) as total_exercises,
          (SELECT COUNT(*) FROM educational_content.user_progress WHERE is_completed = true) as total_exercises_completed,
          (SELECT COUNT(*) FROM gamification_system.achievements) as total_achievements,
          (SELECT COUNT(*) FROM gamification_system.user_achievements) as total_achievements_unlocked,
          (SELECT COALESCE(SUM(ml_coins_earned_total), 0) FROM gamification_system.user_stats) as total_ml_coins_earned,
          (SELECT COALESCE(SUM(total_xp), 0) FROM gamification_system.user_stats) as total_xp_earned
      `;

      const result = await this.pool.query(query);

      return {
        total_exercises: parseInt(result.rows[0].total_exercises, 10),
        total_exercises_completed: parseInt(result.rows[0].total_exercises_completed, 10),
        total_achievements: parseInt(result.rows[0].total_achievements, 10),
        total_achievements_unlocked: parseInt(result.rows[0].total_achievements_unlocked, 10),
        total_ml_coins_earned: parseInt(result.rows[0].total_ml_coins_earned, 10),
        total_xp_earned: parseInt(result.rows[0].total_xp_earned, 10),
      };
    } catch (error) {
      log.error('Error getting system stats:', error);
      throw error;
    }
  }
}
