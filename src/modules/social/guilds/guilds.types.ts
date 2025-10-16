/**
 * Guilds Module Types
 *
 * Type definitions for guilds (teams) features.
 */

/**
 * Guild Member Role
 */
export type GuildRole = 'owner' | 'admin' | 'member';

/**
 * Guild Member Status
 */
export type GuildMemberStatus = 'active' | 'inactive' | 'kicked' | 'left';

/**
 * Guild Interface (based on social_features.teams table)
 */
export interface Guild {
  id: string;
  classroom_id?: string;
  tenant_id: string;
  name: string;
  description?: string;
  motto?: string;
  color_primary: string;
  color_secondary: string;
  avatar_url?: string;
  banner_url?: string;
  badges?: any;
  creator_id: string;
  leader_id?: string;
  team_code?: string;
  max_members: number;
  current_members_count: number;
  is_public: boolean;
  allow_join_requests: boolean;
  require_approval: boolean;
  total_xp: number;
  total_ml_coins: number;
  modules_completed: number;
  achievements_earned: number;
  is_active: boolean;
  is_verified: boolean;
  founded_at: Date;
  last_activity_at?: Date;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

/**
 * Guild Member Interface
 */
export interface GuildMember {
  id: string;
  guild_id: string;
  user_id: string;
  role: GuildRole;
  status: GuildMemberStatus;
  joined_at: Date;
  left_at?: Date;
  kicked_at?: Date;
  kick_reason?: string;
  contribution_xp: number;
  contribution_coins: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Guild Challenge Interface
 */
export interface GuildChallenge {
  id: string;
  guild_id: string;
  title: string;
  description?: string;
  challenge_type: 'xp_goal' | 'modules_completion' | 'achievement_hunt' | 'custom';
  target_value: number;
  current_value: number;
  reward_xp: number;
  reward_coins: number;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  is_completed: boolean;
  completed_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Guild DTO
 */
export interface CreateGuildDto {
  name: string;
  description?: string;
  motto?: string;
  colorPrimary?: string;
  colorSecondary?: string;
  maxMembers?: number;
  isPublic?: boolean;
  allowJoinRequests?: boolean;
  requireApproval?: boolean;
}

/**
 * Update Guild DTO
 */
export interface UpdateGuildDto {
  name?: string;
  description?: string;
  motto?: string;
  colorPrimary?: string;
  colorSecondary?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  maxMembers?: number;
  isPublic?: boolean;
  allowJoinRequests?: boolean;
  requireApproval?: boolean;
}

/**
 * Create Guild Challenge DTO
 */
export interface CreateGuildChallengeDto {
  title: string;
  description?: string;
  challengeType: 'xp_goal' | 'modules_completion' | 'achievement_hunt' | 'custom';
  targetValue: number;
  rewardXp: number;
  rewardCoins: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Guild with Members Response
 */
export interface GuildWithMembers extends Guild {
  members: Array<{
    id: string;
    userId: string;
    displayName: string;
    avatarUrl?: string;
    role: GuildRole;
    contributionXP: number;
    contributionCoins: number;
    joinedAt: Date;
  }>;
}

/**
 * Guild Leaderboard Entry
 */
export interface GuildLeaderboardEntry {
  rank: number;
  guildId: string;
  guildName: string;
  avatarUrl?: string;
  totalXP: number;
  totalMLCoins: number;
  membersCount: number;
  achievementsEarned: number;
  modulesCompleted: number;
}

/**
 * Member Profile in Guild
 */
export interface GuildMemberProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  currentRank?: string;
  role: GuildRole;
  contributionXP: number;
  contributionCoins: number;
  joinedAt: Date;
  isOnline?: boolean;
}
