/**
 * Friends Controller
 *
 * HTTP request handlers for friends endpoints.
 */

import { Response, NextFunction } from 'express';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './friends.types';
import { AuthRequest } from '../../../shared/types';
import { log } from '../../../shared/utils/logger';

export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  /**
   * Get user's friends list
   *
   * GET /api/social/friends
   */
  getFriendsList = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const friends = await this.friendsService.getFriendsList(req.user.id, req.dbClient);

      res.json({
        success: true,
        data: {
          friends,
          total: friends.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send friend request
   *
   * POST /api/social/friends/request
   */
  sendFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { addresseeId } = req.body;

      const dto: SendFriendRequestDto = {
        requesterId: req.user.id,
        addresseeId,
      };

      const result = await this.friendsService.sendFriendRequest(dto, req.dbClient);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get pending friend requests
   *
   * GET /api/social/friends/requests
   */
  getPendingRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const requests = await this.friendsService.getPendingRequests(req.user.id, req.dbClient);

      res.json({
        success: true,
        data: {
          requests,
          total: requests.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Accept friend request
   *
   * POST /api/social/friends/:id/accept
   */
  acceptFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { id } = req.params;

      const result = await this.friendsService.acceptFriendRequest(req.user.id, id, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Decline friend request
   *
   * POST /api/social/friends/:id/decline
   */
  declineFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { id } = req.params;

      const result = await this.friendsService.declineFriendRequest(req.user.id, id, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove friend
   *
   * DELETE /api/social/friends/:id
   */
  removeFriend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { id } = req.params; // friend user_id

      const result = await this.friendsService.removeFriend(req.user.id, id, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get friend recommendations
   *
   * GET /api/social/friends/recommendations
   */
  getRecommendations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const recommendations = await this.friendsService.getFriendRecommendations(req.user.id, req.dbClient);

      res.json({
        success: true,
        data: {
          recommendations,
          total: recommendations.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get friend activities
   *
   * GET /api/social/friends/activities
   */
  getActivities = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const activities = await this.friendsService.getFriendActivities(req.user.id, req.dbClient);

      res.json({
        success: true,
        data: {
          activities,
          total: activities.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search users
   *
   * GET /api/social/friends/search?q=name
   */
  searchUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const query = req.query.q as string;

      if (!query) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query (q) is required',
          },
        });
        return;
      }

      const results = await this.friendsService.searchUsers(query, req.user.id, req.dbClient);

      res.json({
        success: true,
        data: {
          users: results,
          total: results.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get online friends
   *
   * GET /api/social/friends/online
   */
  getOnlineFriends = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const friends = await this.friendsService.getOnlineFriends(req.user.id, req.dbClient);

      res.json({
        success: true,
        data: {
          friends,
          total: friends.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
