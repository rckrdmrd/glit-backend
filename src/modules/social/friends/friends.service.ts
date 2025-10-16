/**
 * Friends Service
 *
 * Business logic for friendship operations.
 */

import { PoolClient } from 'pg';
import { FriendsRepository } from './friends.repository';
import { SendFriendRequestDto, FriendProfile, FriendActivity, FriendRecommendation, UserSearchResult } from './friends.types';
import { AppError } from '../../../middleware/error.middleware';
import { ErrorCode } from '../../../shared/types';
import { log } from '../../../shared/utils/logger';

export class FriendsService {
  constructor(private friendsRepository: FriendsRepository) {}

  /**
   * Initialize friends system (ensure table exists)
   */
  async initialize(dbClient?: PoolClient): Promise<void> {
    await this.friendsRepository.ensureFriendshipsTable(dbClient);
  }

  /**
   * Get user's friends list
   */
  async getFriendsList(userId: string, dbClient?: PoolClient): Promise<FriendProfile[]> {
    try {
      return await this.friendsRepository.getFriendsList(userId, dbClient);
    } catch (error) {
      log.error('Error in getFriendsList:', error);
      throw new AppError('Failed to get friends list', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(dto: SendFriendRequestDto, dbClient?: PoolClient): Promise<{ message: string; friendshipId: string }> {
    try {
      const { requesterId, addresseeId } = dto;

      // Check if users are the same
      if (requesterId === addresseeId) {
        throw new AppError('Cannot send friend request to yourself', 400, ErrorCode.VALIDATION_ERROR);
      }

      // Check if friendship already exists
      const existing = await this.friendsRepository.checkFriendshipExists(requesterId, addresseeId, dbClient);

      if (existing) {
        if (existing.status === 'accepted') {
          throw new AppError('Already friends', 409, ErrorCode.ALREADY_EXISTS);
        }
        if (existing.status === 'pending') {
          throw new AppError('Friend request already sent', 409, ErrorCode.ALREADY_EXISTS);
        }
        if (existing.status === 'blocked') {
          throw new AppError('Cannot send friend request', 403, ErrorCode.FORBIDDEN);
        }
      }

      // Create friend request
      const friendship = await this.friendsRepository.createFriendRequest(requesterId, addresseeId, dbClient);

      return {
        message: 'Friend request sent successfully',
        friendshipId: friendship.id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error sending friend request:', error);
      throw new AppError('Failed to send friend request', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(userId: string, dbClient?: PoolClient): Promise<any[]> {
    try {
      const requests = await this.friendsRepository.getPendingRequests(userId, dbClient);

      return requests.map(req => ({
        id: req.friendship_id,
        requesterId: req.requester_id,
        requester: {
          id: req.profile_id,
          displayName: req.display_name || req.full_name || 'Usuario',
          avatarUrl: req.avatar_url,
          currentRank: req.current_rank,
          totalXP: req.total_xp,
        },
        createdAt: req.created_at,
      }));
    } catch (error) {
      log.error('Error getting pending requests:', error);
      throw new AppError('Failed to get pending requests', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(userId: string, friendshipId: string, dbClient?: PoolClient): Promise<{ message: string }> {
    try {
      // Verify user is the addressee of this request
      const friendship = await this.friendsRepository.acceptFriendRequest(friendshipId, dbClient);

      if (friendship.addressee_id !== userId) {
        throw new AppError('Unauthorized to accept this request', 403, ErrorCode.FORBIDDEN);
      }

      return {
        message: 'Friend request accepted',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new AppError('Friend request not found', 404, ErrorCode.NOT_FOUND);
      }
      log.error('Error accepting friend request:', error);
      throw new AppError('Failed to accept friend request', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Decline friend request
   */
  async declineFriendRequest(userId: string, friendshipId: string, dbClient?: PoolClient): Promise<{ message: string }> {
    try {
      await this.friendsRepository.declineFriendRequest(friendshipId, dbClient);

      return {
        message: 'Friend request declined',
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new AppError('Friend request not found', 404, ErrorCode.NOT_FOUND);
      }
      log.error('Error declining friend request:', error);
      throw new AppError('Failed to decline friend request', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(userId: string, friendId: string, dbClient?: PoolClient): Promise<{ message: string }> {
    try {
      await this.friendsRepository.removeFriend(userId, friendId, dbClient);

      return {
        message: 'Friend removed successfully',
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new AppError('Friendship not found', 404, ErrorCode.NOT_FOUND);
      }
      log.error('Error removing friend:', error);
      throw new AppError('Failed to remove friend', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get friend recommendations
   */
  async getFriendRecommendations(userId: string, dbClient?: PoolClient): Promise<FriendRecommendation[]> {
    try {
      return await this.friendsRepository.getFriendRecommendations(userId, 10, dbClient);
    } catch (error) {
      log.error('Error getting friend recommendations:', error);
      throw new AppError('Failed to get recommendations', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get friend activities
   */
  async getFriendActivities(userId: string, dbClient?: PoolClient): Promise<FriendActivity[]> {
    try {
      return await this.friendsRepository.getFriendActivities(userId, 20, dbClient);
    } catch (error) {
      log.error('Error getting friend activities:', error);
      throw new AppError('Failed to get friend activities', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Search users
   */
  async searchUsers(searchQuery: string, currentUserId: string, dbClient?: PoolClient): Promise<UserSearchResult[]> {
    try {
      if (!searchQuery || searchQuery.trim().length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400, ErrorCode.VALIDATION_ERROR);
      }

      return await this.friendsRepository.searchUsers(searchQuery.trim(), currentUserId, 20, dbClient);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error searching users:', error);
      throw new AppError('Failed to search users', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get online friends
   */
  async getOnlineFriends(userId: string, dbClient?: PoolClient): Promise<FriendProfile[]> {
    try {
      return await this.friendsRepository.getOnlineFriends(userId, dbClient);
    } catch (error) {
      log.error('Error getting online friends:', error);
      throw new AppError('Failed to get online friends', 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
