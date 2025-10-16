/**
 * Admin Module
 *
 * Main entry point for admin functionality.
 * Exports all admin routes and services.
 */

import { Router } from 'express';
import { createAdminRoutes as createRoutes } from './admin.routes';

/**
 * Create Admin Routes
 *
 * Combines all admin sub-routes into a single router.
 */
export function createAdminRoutes(): Router {
  return createRoutes();
}

// Export services and repositories for external use
export { OrganizationsService } from './organizations.service';
export { OrganizationsRepository } from './organizations.repository';
export { ContentService } from './content.service';
export { ContentRepository } from './content.repository';
export { SystemService } from './system.service';
export { SystemRepository } from './system.repository';
export { AuditService } from './audit.service';
export { HealthService } from './health.service';

// User management exports
export { UsersService } from './users.service';
export { UsersRepository } from './users.repository';
export { UsersController } from './users.controller';

// Admin general exports
export { AdminService } from './admin.service';
export { AdminRepository } from './admin.repository';

// Export middleware
export { requireSuperAdmin, adminRateLimit, auditAdminAction } from './admin.middleware';

// Export types
export type { Organization, CreateOrganizationData, UpdateOrganizationData, OrganizationStats } from './organizations.repository';
export type { PendingExercise, MediaFile } from './content.repository';
export type { SystemUser, SystemLog } from './system.repository';
export type { SystemHealth } from './health.service';
export type { AuditLogEvent } from './audit.service';

// Export admin types
export type {
  UserAdmin,
  UserActivity,
  UserFilters,
  UserUpdateData,
  UserSuspensionData,
  FlaggedContent,
  SystemMetrics,
  AdminAction,
  DashboardStats,
  PaginationParams,
  PaginatedResponse,
  ContentModerationAction,
  UserExportData,
  PasswordResetRequest,
  BulkUserAction,
} from './admin.types';
