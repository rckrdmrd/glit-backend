/**
 * System Routes
 *
 * Route definitions for system management endpoints.
 */

import { Router } from 'express';
import { SystemController } from './system.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireSuperAdmin, adminRateLimit, auditAdminAction } from './admin.middleware';
import { validateUuidParam, validatePagination } from './organizations.validation';

const router = Router();
const controller = new SystemController();

// Apply authentication, admin authorization, rate limiting, and audit logging to all routes
router.use(authenticateJWT);
router.use(requireSuperAdmin);
router.use(adminRateLimit);
router.use(auditAdminAction);

/**
 * GET /api/admin/system/health
 * Get system health metrics
 */
router.get('/health', controller.getHealth);

/**
 * GET /api/admin/system/users
 * Get all users
 */
router.get('/users', validatePagination, controller.getUsers);

/**
 * PATCH /api/admin/system/users/:id/role
 * Update user role
 */
router.patch('/users/:id/role', validateUuidParam('id'), controller.updateUserRole);

/**
 * PATCH /api/admin/system/users/:id/status
 * Update user status
 */
router.patch('/users/:id/status', validateUuidParam('id'), controller.updateUserStatus);

/**
 * GET /api/admin/system/logs
 * Get system logs
 */
router.get('/logs', controller.getLogs);

/**
 * POST /api/admin/system/maintenance
 * Toggle maintenance mode
 */
router.post('/maintenance', controller.toggleMaintenance);

/**
 * GET /api/admin/system/statistics
 * Get system statistics (bonus endpoint)
 */
router.get('/statistics', controller.getStatistics);

export default router;
