/**
 * Health Service
 *
 * System health monitoring and metrics collection.
 */

import { Pool } from 'pg';
import { log } from '../../shared/utils/logger';
import * as os from 'os';

export interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: string;
    connections: {
      active: number;
      idle: number;
      waiting: number;
    };
  };
  api: {
    uptime: string;
    uptimeSeconds: number;
    requestsPerMinute?: number;
    errorRate?: string;
  };
  users: {
    total: number;
    active: number;
    online: number;
  };
  storage: {
    used: string;
    available: string;
    percentage: string;
  };
  system: {
    platform: string;
    memory: {
      total: string;
      used: string;
      free: string;
      percentage: string;
    };
    cpu: {
      cores: number;
      loadAverage: number[];
    };
  };
}

export class HealthService {
  private startTime: number;

  constructor(private pool: Pool) {
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const [database, users, storage] = await Promise.all([
      this.getDatabaseHealth(),
      this.getUserMetrics(),
      this.getStorageMetrics(),
    ]);

    return {
      database,
      api: this.getApiMetrics(),
      users,
      storage,
      system: this.getSystemMetrics(),
    };
  }

  /**
   * Get database health metrics
   */
  private async getDatabaseHealth(): Promise<SystemHealth['database']> {
    try {
      const startTime = Date.now();

      // Test database connection
      await this.pool.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      // Get connection pool stats
      const poolStats = {
        active: this.pool.totalCount - this.pool.idleCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount,
      };

      return {
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'down',
        responseTime: `${responseTime}ms`,
        connections: poolStats,
      };
    } catch (error) {
      log.error('Database health check failed:', error);
      return {
        status: 'down',
        responseTime: 'N/A',
        connections: {
          active: 0,
          idle: 0,
          waiting: 0,
        },
      };
    }
  }

  /**
   * Get API metrics
   */
  private getApiMetrics(): SystemHealth['api'] {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const uptime = this.formatUptime(uptimeSeconds);

    return {
      uptime,
      uptimeSeconds,
      requestsPerMinute: 0, // Would need request counter middleware
      errorRate: '0%', // Would need error counter middleware
    };
  }

  /**
   * Get user metrics
   */
  private async getUserMetrics(): Promise<SystemHealth['users']> {
    try {
      const result = await this.pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '7 days' THEN 1 END) as active,
          COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '15 minutes' THEN 1 END) as online
        FROM auth_management.profiles
      `);

      const row = result.rows[0];

      return {
        total: parseInt(row.total) || 0,
        active: parseInt(row.active) || 0,
        online: parseInt(row.online) || 0,
      };
    } catch (error) {
      log.error('Error fetching user metrics:', error);
      return {
        total: 0,
        active: 0,
        online: 0,
      };
    }
  }

  /**
   * Get storage metrics
   */
  private async getStorageMetrics(): Promise<SystemHealth['storage']> {
    try {
      // This would need actual file storage integration
      // For now, returning placeholder values
      const totalGb = 1000;
      const usedGb = 45;
      const availableGb = totalGb - usedGb;
      const percentage = ((usedGb / totalGb) * 100).toFixed(1);

      return {
        used: `${usedGb}GB`,
        available: `${availableGb}GB`,
        percentage: `${percentage}%`,
      };
    } catch (error) {
      log.error('Error fetching storage metrics:', error);
      return {
        used: 'N/A',
        available: 'N/A',
        percentage: 'N/A',
      };
    }
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): SystemHealth['system'] {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      platform: `${os.platform()} ${os.release()}`,
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        percentage: ((usedMem / totalMem) * 100).toFixed(1) + '%',
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
    };
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') : '< 1m';
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)}GB`;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const [tableStats, indexStats] = await Promise.all([
        this.getTableStats(),
        this.getIndexStats(),
      ]);

      return {
        tables: tableStats,
        indexes: indexStats,
      };
    } catch (error) {
      log.error('Error fetching database stats:', error);
      throw error;
    }
  }

  /**
   * Get table statistics
   */
  private async getTableStats(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
          n_live_tup AS row_count
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `);

      return result.rows;
    } catch (error) {
      log.error('Error fetching table stats:', error);
      return [];
    }
  }

  /**
   * Get index statistics
   */
  private async getIndexStats(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) AS size,
          idx_scan AS scans,
          idx_tup_read AS tuples_read,
          idx_tup_fetch AS tuples_fetched
        FROM pg_stat_user_indexes
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 20
      `);

      return result.rows;
    } catch (error) {
      log.error('Error fetching index stats:', error);
      return [];
    }
  }
}
