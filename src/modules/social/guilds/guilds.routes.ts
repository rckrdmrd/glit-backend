/**
 * Guilds Routes
 *
 * Route definitions for guilds (teams) endpoints.
 */

import { Router } from 'express';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildsRepository } from './guilds.repository';
import { authenticateJWT } from '../../../middleware/auth.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { createGuildSchema, updateGuildSchema, createChallengeSchema, updateMemberRoleSchema } from './guilds.validation';
import { pool } from '../../../database/pool';

// Initialize dependencies
const guildsRepository = new GuildsRepository(pool);
const guildsService = new GuildsService(guildsRepository);
const guildsController = new GuildsController(guildsService);

// Initialize guilds system (create tables if needed)
guildsService.initialize().catch(err => {
  console.error('Failed to initialize guilds system:', err);
});

// Create router
const router = Router();

/**
 * Public routes (no authentication required)
 */

// GET /api/social/guilds - List all public guilds (paginated)
router.get('/', guildsController.getPublicGuilds);

// GET /api/social/guilds/search - Search guilds by name
router.get('/search', guildsController.searchGuilds);

// GET /api/social/guilds/leaderboard - Get global guild leaderboard
router.get('/leaderboard', guildsController.getGuildLeaderboard);

// GET /api/social/guilds/user/:userId - Get user's current guild
router.get('/user/:userId', guildsController.getUserGuild);

/**
 * Protected routes (authentication required)
 */

// POST /api/social/guilds - Create new guild
router.post('/', authenticateJWT, validate(createGuildSchema), guildsController.createGuild);

// GET /api/social/guilds/:id - Get guild details
router.get('/:id', guildsController.getGuildById);

// PUT /api/social/guilds/:id - Update guild (owner only)
router.put('/:id', authenticateJWT, validate(updateGuildSchema), guildsController.updateGuild);

// DELETE /api/social/guilds/:id - Delete guild (owner only)
router.delete('/:id', authenticateJWT, guildsController.deleteGuild);

// POST /api/social/guilds/:id/join - Join guild
router.post('/:id/join', authenticateJWT, guildsController.joinGuild);

// POST /api/social/guilds/:id/leave - Leave guild
router.post('/:id/leave', authenticateJWT, guildsController.leaveGuild);

// GET /api/social/guilds/:id/members - Get guild members
router.get('/:id/members', guildsController.getGuildMembers);

// DELETE /api/social/guilds/:guildId/members/:memberId - Remove member (owner/admin)
router.delete('/:guildId/members/:memberId', authenticateJWT, guildsController.removeMember);

// PATCH /api/social/guilds/:guildId/members/:memberId/role - Update member role (owner only)
router.patch('/:guildId/members/:memberId/role', authenticateJWT, validate(updateMemberRoleSchema), guildsController.updateMemberRole);

// GET /api/social/guilds/:id/challenges - Get guild challenges
router.get('/:id/challenges', guildsController.getGuildChallenges);

// POST /api/social/guilds/:id/challenges - Create guild challenge (owner/admin)
router.post('/:id/challenges', authenticateJWT, validate(createChallengeSchema), guildsController.createChallenge);

export default router;
