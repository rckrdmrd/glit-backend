/**
 * Friends Routes
 *
 * Route definitions for friends endpoints.
 */

import { Router } from 'express';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FriendsRepository } from './friends.repository';
import { authenticateJWT } from '../../../middleware/auth.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { sendFriendRequestSchema } from './friends.validation';
import { pool } from '../../../database/pool';

// Initialize dependencies
const friendsRepository = new FriendsRepository(pool);
const friendsService = new FriendsService(friendsRepository);
const friendsController = new FriendsController(friendsService);

// Initialize friends system (create table if needed)
friendsService.initialize().catch(err => {
  console.error('Failed to initialize friends system:', err);
});

// Create router
const router = Router();

/**
 * All friends routes require authentication
 */

// GET /api/social/friends - Get user's friends list
router.get('/', authenticateJWT, friendsController.getFriendsList);

// POST /api/social/friends/request - Send friend request
router.post('/request', authenticateJWT, validate(sendFriendRequestSchema), friendsController.sendFriendRequest);

// GET /api/social/friends/requests - Get pending friend requests
router.get('/requests', authenticateJWT, friendsController.getPendingRequests);

// POST /api/social/friends/:id/accept - Accept friend request
router.post('/:id/accept', authenticateJWT, friendsController.acceptFriendRequest);

// POST /api/social/friends/:id/decline - Decline friend request
router.post('/:id/decline', authenticateJWT, friendsController.declineFriendRequest);

// DELETE /api/social/friends/:id - Remove friend
router.delete('/:id', authenticateJWT, friendsController.removeFriend);

// GET /api/social/friends/recommendations - Get friend recommendations
router.get('/recommendations', authenticateJWT, friendsController.getRecommendations);

// GET /api/social/friends/activities - Get friend activities
router.get('/activities', authenticateJWT, friendsController.getActivities);

// GET /api/social/friends/search - Search users
router.get('/search', authenticateJWT, friendsController.searchUsers);

// GET /api/social/friends/online - Get online friends
router.get('/online', authenticateJWT, friendsController.getOnlineFriends);

export default router;
