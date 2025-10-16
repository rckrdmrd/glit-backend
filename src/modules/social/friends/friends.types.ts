/**
 * Friends Module Types
 *
 * Type definitions for friends and friendship features.
 */

/**
 * Friendship Status
 */
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

/**
 * Friendship Interface
 */
export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: Date;
  updated_at: Date;
  accepted_at?: Date;
}

/**
 * Friend Profile (extended user profile)
 */
export interface FriendProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  currentRank?: string;
  totalXP?: number;
  isOnline?: boolean;
  lastSeenAt?: Date;
  friendshipId: string;
  friendsSince: Date;
}

/**
 * Friend Request DTO
 */
export interface SendFriendRequestDto {
  requesterId: string;
  addresseeId: string;
}

/**
 * Friend Activity
 */
export interface FriendActivity {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  activityType: 'achievement_unlocked' | 'module_completed' | 'rank_promoted' | 'challenge_completed';
  activityData: {
    title: string;
    description?: string;
    icon?: string;
    xpEarned?: number;
    coinsEarned?: number;
  };
  timestamp: Date;
}

/**
 * Friend Recommendation
 */
export interface FriendRecommendation {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  currentRank?: string;
  mutualFriends: number;
  similarInterests?: string[];
  reason: 'mutual_friends' | 'same_classroom' | 'similar_rank' | 'recent_activity';
}

/**
 * User Search Result
 */
export interface UserSearchResult {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  currentRank?: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
}
