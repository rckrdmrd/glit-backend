/**
 * Admin Routes
 *
 * Main router combining all admin sub-routes.
 */

import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireSuperAdmin, adminRateLimit, auditAdminAction } from './admin.middleware';

// Import sub-routes
import usersRoutes from './users.routes';
import organizationsRoutes from './organizations.routes';
import contentRoutes from './content.routes';
import systemRoutes from './system.routes';

/**
 * Create Admin Routes
 *
 * Combines all admin sub-routes with authentication and authorization.
 */
export function createAdminRoutes(): Router {
  const router = Router();

  // Apply global middleware to all admin routes
  router.use(authenticateJWT);
  router.use(requireSuperAdmin);
  router.use(adminRateLimit);
  router.use(auditAdminAction);

  // Mount sub-routes
  router.use('/users', usersRoutes);
  router.use('/organizations', organizationsRoutes);
  router.use('/content', contentRoutes);
  router.use('/system', systemRoutes);

  // Root admin endpoint - Dashboard stats
  router.get('/', async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        data: {
          message: 'Admin API',
          version: '1.0.0',
          endpoints: {
            users: '/api/admin/users',
            organizations: '/api/admin/organizations',
            content: '/api/admin/content',
            system: '/api/admin/system',
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve admin info',
        },
      });
    }
  });

  return router;
}

export default createAdminRoutes;
