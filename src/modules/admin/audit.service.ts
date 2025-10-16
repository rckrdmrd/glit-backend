/**
 * Audit Service
 *
 * Centralized service for audit logging.
 * Tracks all critical system actions for compliance and security.
 */

import { Pool } from 'pg';
import { log } from '../../shared/utils/logger';

/**
 * Audit Log Event Interface
 */
export interface AuditLogEvent {
  tenant_id?: string;
  event_type: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  actor_id?: string;
  actor_type?: 'user' | 'system' | 'api' | 'cron';
  actor_ip?: string;
  actor_user_agent?: string;
  target_id?: string;
  target_type?: string;
  session_id?: string;
  description?: string;
  old_values?: any;
  new_values?: any;
  changes?: any;
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  status?: 'success' | 'failure' | 'partial';
  error_code?: string;
  error_message?: string;
  stack_trace?: string;
  request_id?: string;
  correlation_id?: string;
  additional_data?: any;
  tags?: string[];
}

export class AuditService {
  constructor(private pool: Pool) {}

  /**
   * Log Audit Event
   *
   * Records an audit event to the audit_logs table.
   *
   * @param event - Audit log event data
   */
  async logEvent(event: AuditLogEvent): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO audit_logging.audit_logs (
          tenant_id,
          event_type,
          action,
          resource_type,
          resource_id,
          actor_id,
          actor_type,
          actor_ip,
          actor_user_agent,
          target_id,
          target_type,
          session_id,
          description,
          old_values,
          new_values,
          changes,
          severity,
          status,
          error_code,
          error_message,
          stack_trace,
          request_id,
          correlation_id,
          additional_data,
          tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
        [
          event.tenant_id || null,
          event.event_type,
          event.action,
          event.resource_type || null,
          event.resource_id || null,
          event.actor_id || null,
          event.actor_type || 'user',
          event.actor_ip || null,
          event.actor_user_agent || null,
          event.target_id || null,
          event.target_type || null,
          event.session_id || null,
          event.description || null,
          event.old_values ? JSON.stringify(event.old_values) : null,
          event.new_values ? JSON.stringify(event.new_values) : null,
          event.changes ? JSON.stringify(event.changes) : null,
          event.severity || 'info',
          event.status || 'success',
          event.error_code || null,
          event.error_message || null,
          event.stack_trace || null,
          event.request_id || null,
          event.correlation_id || null,
          event.additional_data ? JSON.stringify(event.additional_data) : null,
          event.tags || null,
        ]
      );

      log.debug(`Audit event logged: ${event.event_type} - ${event.action}`);
    } catch (error) {
      // Don't throw on audit log failure - log error but continue
      log.error('Failed to log audit event:', error);
    }
  }

  /**
   * Log Organization Created
   */
  async logOrganizationCreated(
    organizationId: string,
    organizationData: any,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'organization_created',
      action: 'create',
      resource_type: 'organization',
      resource_id: organizationId,
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'info',
      status: 'success',
      description: `Organization created: ${organizationData.name}`,
      new_values: organizationData,
      tags: ['admin', 'organization', 'create'],
    });
  }

  /**
   * Log Organization Updated
   */
  async logOrganizationUpdated(
    organizationId: string,
    oldValues: any,
    newValues: any,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    const changes = this.calculateChanges(oldValues, newValues);

    await this.logEvent({
      event_type: 'organization_updated',
      action: 'update',
      resource_type: 'organization',
      resource_id: organizationId,
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'info',
      status: 'success',
      description: `Organization updated: ${newValues.name}`,
      old_values: oldValues,
      new_values: newValues,
      changes,
      tags: ['admin', 'organization', 'update'],
    });
  }

  /**
   * Log Organization Deleted
   */
  async logOrganizationDeleted(
    organizationId: string,
    organizationData: any,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'organization_deleted',
      action: 'delete',
      resource_type: 'organization',
      resource_id: organizationId,
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'warning',
      status: 'success',
      description: `Organization deleted: ${organizationData.name}`,
      old_values: organizationData,
      tags: ['admin', 'organization', 'delete'],
    });
  }

  /**
   * Log User Role Changed
   */
  async logUserRoleChanged(
    userId: string,
    oldRole: string,
    newRole: string,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'user_role_changed',
      action: 'update_role',
      resource_type: 'user',
      resource_id: userId,
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'warning',
      status: 'success',
      description: `User role changed from ${oldRole} to ${newRole}`,
      old_values: { role: oldRole },
      new_values: { role: newRole },
      changes: { role: { from: oldRole, to: newRole } },
      tags: ['admin', 'user', 'role', 'security'],
    });
  }

  /**
   * Log User Status Changed
   */
  async logUserStatusChanged(
    userId: string,
    oldStatus: string,
    newStatus: string,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'user_status_changed',
      action: 'update_status',
      resource_type: 'user',
      resource_id: userId,
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'info',
      status: 'success',
      description: `User status changed from ${oldStatus} to ${newStatus}`,
      old_values: { status: oldStatus },
      new_values: { status: newStatus },
      changes: { status: { from: oldStatus, to: newStatus } },
      tags: ['admin', 'user', 'status'],
    });
  }

  /**
   * Log Content Approved
   */
  async logContentApproved(
    contentId: string,
    contentType: string,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'content_approved',
      action: 'approve',
      resource_type: contentType,
      resource_id: contentId,
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'info',
      status: 'success',
      description: `${contentType} approved`,
      tags: ['admin', 'content', 'approval'],
    });
  }

  /**
   * Log Content Rejected
   */
  async logContentRejected(
    contentId: string,
    contentType: string,
    reason: string,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'content_rejected',
      action: 'reject',
      resource_type: contentType,
      resource_id: contentId,
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'info',
      status: 'success',
      description: `${contentType} rejected: ${reason}`,
      additional_data: { rejection_reason: reason },
      tags: ['admin', 'content', 'rejection'],
    });
  }

  /**
   * Log Feature Flag Changed
   */
  async logFeatureFlagChanged(
    organizationId: string,
    featureName: string,
    oldValue: boolean,
    newValue: boolean,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'feature_flag_changed',
      action: 'toggle_feature',
      resource_type: 'organization',
      resource_id: organizationId,
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'warning',
      status: 'success',
      description: `Feature flag '${featureName}' changed from ${oldValue} to ${newValue}`,
      old_values: { [featureName]: oldValue },
      new_values: { [featureName]: newValue },
      changes: { [featureName]: { from: oldValue, to: newValue } },
      tags: ['admin', 'feature_flag', 'configuration'],
    });
  }

  /**
   * Log System Configuration Changed
   */
  async logSystemConfigChanged(
    configKey: string,
    oldValue: any,
    newValue: any,
    actorId: string,
    actorIp?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'system_config_changed',
      action: 'update_config',
      resource_type: 'system_config',
      actor_id: actorId,
      actor_type: 'user',
      actor_ip: actorIp,
      severity: 'warning',
      status: 'success',
      description: `System configuration '${configKey}' changed`,
      old_values: { [configKey]: oldValue },
      new_values: { [configKey]: newValue },
      changes: { [configKey]: { from: oldValue, to: newValue } },
      tags: ['admin', 'system', 'configuration'],
    });
  }

  /**
   * Calculate changes between old and new values
   */
  private calculateChanges(oldValues: any, newValues: any): any {
    const changes: any = {};

    Object.keys(newValues).forEach((key) => {
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          from: oldValues[key],
          to: newValues[key],
        };
      }
    });

    return changes;
  }

  /**
   * Get Audit Logs
   *
   * Retrieves audit logs with filtering and pagination.
   */
  async getAuditLogs(filters: {
    tenant_id?: string;
    event_type?: string;
    resource_type?: string;
    actor_id?: string;
    severity?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.tenant_id) {
        conditions.push(`tenant_id = $${paramIndex++}`);
        values.push(filters.tenant_id);
      }

      if (filters.event_type) {
        conditions.push(`event_type = $${paramIndex++}`);
        values.push(filters.event_type);
      }

      if (filters.resource_type) {
        conditions.push(`resource_type = $${paramIndex++}`);
        values.push(filters.resource_type);
      }

      if (filters.actor_id) {
        conditions.push(`actor_id = $${paramIndex++}`);
        values.push(filters.actor_id);
      }

      if (filters.severity) {
        conditions.push(`severity = $${paramIndex++}`);
        values.push(filters.severity);
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
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      const query = `
        SELECT * FROM audit_logging.audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      log.error('Error fetching audit logs:', error);
      throw error;
    }
  }
}
