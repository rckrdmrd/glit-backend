/**
 * Social Module
 *
 * Main entry point for social features module.
 * Combines friends and guilds functionality.
 */

import { Router } from 'express';
import friendsRoutes from './friends/friends.routes';
import guildsRoutes from './guilds/guilds.routes';

/**
 * Create Social Routes
 *
 * Combines all social feature routes (friends + guilds).
 */
export function createSocialRoutes(): Router {
  const router = Router();

  // Mount sub-routes
  router.use('/friends', friendsRoutes);
  router.use('/guilds', guildsRoutes);

  return router;
}

// Export individual route modules for direct access if needed
export { friendsRoutes, guildsRoutes };

// Export default
export default createSocialRoutes;
