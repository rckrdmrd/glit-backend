/**
 * Organizations Routes
 *
 * Route definitions for organization management endpoints.
 */

import { Router } from 'express';
import { OrganizationsController } from './organizations.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireSuperAdmin, adminRateLimit, auditAdminAction } from './admin.middleware';
import {
  validateCreateOrganization,
  validateUpdateOrganization,
  validateUpdateSubscription,
  validateUpdateFeatureFlags,
  validateUuidParam,
  validatePagination,
} from './organizations.validation';

const router = Router();
const controller = new OrganizationsController();

// Apply authentication, admin authorization, rate limiting, and audit logging to all routes
router.use(authenticateJWT);
router.use(requireSuperAdmin);
router.use(adminRateLimit);
router.use(auditAdminAction);

/**
 * GET /api/admin/organizations
 * List all organizations
 */
router.get('/', validatePagination, controller.getAll);

/**
 * GET /api/admin/organizations/:id
 * Get organization details
 */
router.get('/:id', validateUuidParam('id'), controller.getById);

/**
 * POST /api/admin/organizations
 * Create new organization
 */
router.post('/', validateCreateOrganization, controller.create);

/**
 * PUT /api/admin/organizations/:id
 * Update organization
 */
router.put('/:id', validateUuidParam('id'), validateUpdateOrganization, controller.update);

/**
 * DELETE /api/admin/organizations/:id
 * Delete organization (soft delete)
 */
router.delete('/:id', validateUuidParam('id'), controller.delete);

/**
 * GET /api/admin/organizations/:id/users
 * Get organization users
 */
router.get('/:id/users', validateUuidParam('id'), validatePagination, controller.getUsers);

/**
 * PATCH /api/admin/organizations/:id/subscription
 * Update organization subscription
 */
router.patch(
  '/:id/subscription',
  validateUuidParam('id'),
  validateUpdateSubscription,
  controller.updateSubscription
);

/**
 * PATCH /api/admin/organizations/:id/features
 * Toggle feature flags
 */
router.patch(
  '/:id/features',
  validateUuidParam('id'),
  validateUpdateFeatureFlags,
  controller.updateFeatureFlags
);

export default router;
