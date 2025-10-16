/**
 * Content Routes
 *
 * Route definitions for content management endpoints.
 */

import { Router } from 'express';
import { ContentController } from './content.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireSuperAdmin, adminRateLimit, auditAdminAction } from './admin.middleware';
import { validateUuidParam, validatePagination } from './organizations.validation';

const router = Router();
const controller = new ContentController();

// Apply authentication, admin authorization, rate limiting, and audit logging to all routes
router.use(authenticateJWT);
router.use(requireSuperAdmin);
router.use(adminRateLimit);
router.use(auditAdminAction);

/**
 * GET /api/admin/content/exercises/pending
 * Get pending exercises for approval
 */
router.get('/exercises/pending', validatePagination, controller.getPendingExercises);

/**
 * POST /api/admin/content/exercises/:id/approve
 * Approve exercise
 */
router.post('/exercises/:id/approve', validateUuidParam('id'), controller.approveExercise);

/**
 * POST /api/admin/content/exercises/:id/reject
 * Reject exercise
 */
router.post('/exercises/:id/reject', validateUuidParam('id'), controller.rejectExercise);

/**
 * GET /api/admin/content/media
 * Get media library
 */
router.get('/media', validatePagination, controller.getMediaLibrary);

/**
 * DELETE /api/admin/content/media/:id
 * Delete media file
 */
router.delete('/media/:id', validateUuidParam('id'), controller.deleteMedia);

/**
 * POST /api/admin/content/version
 * Create content version
 */
router.post('/version', controller.createContentVersion);

export default router;
