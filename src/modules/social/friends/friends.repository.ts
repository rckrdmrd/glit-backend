/**
 * Friends Repository
 *
 * Database access layer for friendship operations.
 */

import { Pool, PoolClient } from 'pg';
import { Friendship, FriendProfile, FriendActivity, FriendRecommendation, UserSearchResult } from './friends.types';
import { log } from '../../../shared/utils/logger';

export class FriendsRepository {
  constructor(private pool: Pool) {}

  /**
   * Create friendship table if not exists
   * This is a helper method for initial setup
   */
  async ensureFriendshipsTable(client?: PoolClient): Promise<void> {
    const db = client || this.pool;

    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS social_features.friendships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          requester_id UUID NOT NULL REFERENCES auth_management.profiles(id) ON DELETE CASCADE,
          addressee_id UUID NOT NULL REFERENCES auth_management.profiles(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          accepted_at TIMESTAMPTZ,
          UNIQUE(requester_id, addressee_id),
          CHECK (requester_id != addressee_id)
        );

        CREATE INDEX IF NOT EXISTS idx_friendships_requester ON social_features.friendships(requester_id);
        CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON social_features.friendships(addressee_id);
        CREATE INDEX IF NOT EXISTS idx_friendships_status ON social_features.friendships(status);
      `);
    } catch (error) {
      // Table might already exist, log and continue
      log.debug('Friendships table setup:', error);
    }
  }

  /**
   * Check if friendship exists (in any direction)
   */
  async checkFriendshipExists(userId1: string, userId2: string, dbClient?: PoolClient): Promise<Friendship | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Friendship>(
        `SELECT * FROM social_features.friendships
         WHERE (requester_id = $1 AND addressee_id = $2)
            OR (requester_id = $2 AND addressee_id = $1)`,
        [userId1, userId2]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error checking friendship:', error);
      throw error;
    }
  }

  /**
   * Send friend request
   */
  async createFriendRequest(requesterId: string, addresseeId: string, dbClient?: PoolClient): Promise<Friendship> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Friendship>(
        `INSERT INTO social_features.friendships (requester_id, addressee_id, status)
         VALUES ($1, $2, 'pending')
         RETURNING *`,
        [requesterId, addresseeId]
      );

      log.info(`Friend request sent from ${requesterId} to ${addresseeId}`);
      return result.rows[0];
    } catch (error) {
      log.error('Error creating friend request:', error);
      throw error;
    }
  }

  /**
   * Get pending friend requests for user
   */
  async getPendingRequests(userId: string, dbClient?: PoolClient): Promise<any[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          f.id as friendship_id,
          f.requester_id,
          f.created_at,
          p.id as profile_id,
          p.display_name,
          p.avatar_url,
          p.full_name,
          us.current_rank,
          us.total_xp
         FROM social_features.friendships f
         JOIN auth_management.profiles p ON f.requester_id = p.user_id
         LEFT JOIN gamification_system.user_stats us ON p.id = us.user_id
         WHERE f.addressee_id = $1 AND f.status = 'pending'
         ORDER BY f.created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting pending requests:', error);
      throw error;
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(friendshipId: string, dbClient?: PoolClient): Promise<Friendship> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Friendship>(
        `UPDATE social_features.friendships
         SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [friendshipId]
      );

      if (result.rows.length === 0) {
        throw new Error('Friend request not found or already processed');
      }

      log.info(`Friend request accepted: ${friendshipId}`);
      return result.rows[0];
    } catch (error) {
      log.error('Error accepting friend request:', error);
      throw error;
    }
  }

  /**
   * Decline friend request
   */
  async declineFriendRequest(friendshipId: string, dbClient?: PoolClient): Promise<void> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `UPDATE social_features.friendships
         SET status = 'declined', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'`,
        [friendshipId]
      );

      if (result.rowCount === 0) {
        throw new Error('Friend request not found or already processed');
      }

      log.info(`Friend request declined: ${friendshipId}`);
    } catch (error) {
      log.error('Error declining friend request:', error);
      throw error;
    }
  }

  /**
   * Remove friend (delete friendship)
   */
  async removeFriend(userId: string, friendId: string, dbClient?: PoolClient): Promise<void> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `DELETE FROM social_features.friendships
         WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
           AND status = 'accepted'`,
        [userId, friendId]
      );

      if (result.rowCount === 0) {
        throw new Error('Friendship not found');
      }

      log.info(`Friendship removed between ${userId} and ${friendId}`);
    } catch (error) {
      log.error('Error removing friend:', error);
      throw error;
    }
  }

  /**
   * Get user's friends list
   */
  async getFriendsList(userId: string, dbClient?: PoolClient): Promise<FriendProfile[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          f.id as friendship_id,
          f.accepted_at as friends_since,
          CASE
            WHEN f.requester_id = $1 THEN f.addressee_id
            ELSE f.requester_id
          END as friend_user_id,
          p.id as profile_id,
          p.display_name,
          p.avatar_url,
          p.full_name,
          us.current_rank,
          us.total_xp,
          us.last_login_at
         FROM social_features.friendships f
         JOIN auth_management.profiles p ON
           CASE
             WHEN f.requester_id = $1 THEN p.user_id = f.addressee_id
             ELSE p.user_id = f.requester_id
           END
         LEFT JOIN gamification_system.user_stats us ON p.id = us.user_id
         WHERE (f.requester_id = $1 OR f.addressee_id = $1)
           AND f.status = 'accepted'
         ORDER BY p.display_name ASC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.profile_id,
        userId: row.friend_user_id,
        displayName: row.display_name || row.full_name || 'Usuario',
        avatarUrl: row.avatar_url,
        currentRank: row.current_rank,
        totalXP: row.total_xp,
        isOnline: row.last_login_at && (Date.now() - new Date(row.last_login_at).getTime()) < 5 * 60 * 1000,
        lastSeenAt: row.last_login_at,
        friendshipId: row.friendship_id,
        friendsSince: row.friends_since,
      }));
    } catch (error) {
      log.error('Error getting friends list:', error);
      throw error;
    }
  }

  /**
   * Get online friends
   */
  async getOnlineFriends(userId: string, dbClient?: PoolClient): Promise<FriendProfile[]> {
    try {
      const client = dbClient || this.pool;

      // Consider online if logged in within last 5 minutes
      const result = await client.query(
        `SELECT
          f.id as friendship_id,
          f.accepted_at as friends_since,
          CASE
            WHEN f.requester_id = $1 THEN f.addressee_id
            ELSE f.requester_id
          END as friend_user_id,
          p.id as profile_id,
          p.display_name,
          p.avatar_url,
          us.current_rank,
          us.total_xp,
          us.last_login_at
         FROM social_features.friendships f
         JOIN auth_management.profiles p ON
           CASE
             WHEN f.requester_id = $1 THEN p.user_id = f.addressee_id
             ELSE p.user_id = f.requester_id
           END
         LEFT JOIN gamification_system.user_stats us ON p.id = us.user_id
         WHERE (f.requester_id = $1 OR f.addressee_id = $1)
           AND f.status = 'accepted'
           AND us.last_login_at > NOW() - INTERVAL '5 minutes'
         ORDER BY us.last_login_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.profile_id,
        userId: row.friend_user_id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        currentRank: row.current_rank,
        totalXP: row.total_xp,
        isOnline: true,
        lastSeenAt: row.last_login_at,
        friendshipId: row.friendship_id,
        friendsSince: row.friends_since,
      }));
    } catch (error) {
      log.error('Error getting online friends:', error);
      throw error;
    }
  }

  /**
   * Search users by name
   */
  async searchUsers(searchQuery: string, currentUserId: string, limit: number = 20, dbClient?: PoolClient): Promise<UserSearchResult[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          p.id as profile_id,
          p.user_id,
          p.display_name,
          p.email,
          p.avatar_url,
          us.current_rank,
          f.id as friendship_id,
          f.status as friendship_status
         FROM auth_management.profiles p
         LEFT JOIN gamification_system.user_stats us ON p.id = us.user_id
         LEFT JOIN social_features.friendships f ON
           ((f.requester_id = $2 AND f.addressee_id = p.user_id) OR
            (f.requester_id = p.user_id AND f.addressee_id = $2))
         WHERE p.user_id != $2
           AND (p.display_name ILIKE $1 OR p.full_name ILIKE $1 OR p.email ILIKE $1)
           AND p.is_active = true
         ORDER BY p.display_name ASC
         LIMIT $3`,
        [`%${searchQuery}%`, currentUserId, limit]
      );

      return result.rows.map(row => ({
        id: row.profile_id,
        userId: row.user_id,
        displayName: row.display_name,
        email: row.email,
        avatarUrl: row.avatar_url,
        currentRank: row.current_rank,
        isFriend: row.friendship_status === 'accepted',
        hasPendingRequest: row.friendship_status === 'pending',
      }));
    } catch (error) {
      log.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get friend recommendations
   */
  async getFriendRecommendations(userId: string, limit: number = 10, dbClient?: PoolClient): Promise<FriendRecommendation[]> {
    try {
      const client = dbClient || this.pool;

      // Get users with mutual friends or same classroom
      const result = await client.query(
        `WITH user_friends AS (
          SELECT CASE
            WHEN requester_id = $1 THEN addressee_id
            ELSE requester_id
          END as friend_id
          FROM social_features.friendships
          WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
        ),
        mutual_friends_count AS (
          SELECT
            CASE
              WHEN f.requester_id IN (SELECT friend_id FROM user_friends) THEN f.addressee_id
              ELSE f.requester_id
            END as potential_friend_id,
            COUNT(*) as mutual_count
          FROM social_features.friendships f
          WHERE f.status = 'accepted'
            AND (f.requester_id IN (SELECT friend_id FROM user_friends) OR
                 f.addressee_id IN (SELECT friend_id FROM user_friends))
            AND f.requester_id != $1 AND f.addressee_id != $1
          GROUP BY potential_friend_id
        )
        SELECT DISTINCT
          p.id as profile_id,
          p.user_id,
          p.display_name,
          p.avatar_url,
          us.current_rank,
          COALESCE(mfc.mutual_count, 0) as mutual_friends,
          CASE
            WHEN mfc.mutual_count > 0 THEN 'mutual_friends'
            ELSE 'similar_rank'
          END as reason
        FROM auth_management.profiles p
        LEFT JOIN gamification_system.user_stats us ON p.id = us.user_id
        LEFT JOIN mutual_friends_count mfc ON p.user_id = mfc.potential_friend_id
        WHERE p.user_id != $1
          AND p.user_id NOT IN (SELECT friend_id FROM user_friends)
          AND p.user_id NOT IN (
            SELECT CASE
              WHEN requester_id = $1 THEN addressee_id
              ELSE requester_id
            END
            FROM social_features.friendships
            WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'pending'
          )
          AND p.is_active = true
          AND (mfc.mutual_count > 0 OR us.current_rank IS NOT NULL)
        ORDER BY mutual_friends DESC, us.total_xp DESC
        LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => ({
        id: row.profile_id,
        userId: row.user_id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        currentRank: row.current_rank,
        mutualFriends: row.mutual_friends,
        reason: row.reason as any,
      }));
    } catch (error) {
      log.error('Error getting friend recommendations:', error);
      throw error;
    }
  }

  /**
   * Get recent friend activities
   */
  async getFriendActivities(userId: string, limit: number = 20, dbClient?: PoolClient): Promise<FriendActivity[]> {
    try {
      const client = dbClient || this.pool;

      // Get recent achievements and activities from friends
      const result = await client.query(
        `WITH user_friends AS (
          SELECT CASE
            WHEN requester_id = $1 THEN addressee_id
            ELSE requester_id
          END as friend_id
          FROM social_features.friendships
          WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
        )
        SELECT
          p.id as profile_id,
          p.user_id,
          p.display_name,
          p.avatar_url,
          ua.unlocked_at as timestamp,
          a.name as achievement_name,
          a.description as achievement_description,
          a.icon as achievement_icon,
          a.xp_reward,
          a.ml_coins_reward,
          'achievement_unlocked' as activity_type
        FROM gamification_system.user_achievements ua
        JOIN gamification_system.achievements a ON ua.achievement_id = a.id
        JOIN auth_management.profiles p ON ua.user_id = p.id
        WHERE p.user_id IN (SELECT friend_id FROM user_friends)
          AND ua.unlocked_at > NOW() - INTERVAL '7 days'
        ORDER BY ua.unlocked_at DESC
        LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => ({
        id: row.profile_id,
        userId: row.user_id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        activityType: row.activity_type,
        activityData: {
          title: row.achievement_name,
          description: row.achievement_description,
          icon: row.achievement_icon,
          xpEarned: row.xp_reward,
          coinsEarned: row.ml_coins_reward,
        },
        timestamp: row.timestamp,
      }));
    } catch (error) {
      log.error('Error getting friend activities:', error);
      throw error;
    }
  }
}
