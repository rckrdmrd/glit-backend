/**
 * Missions System Types
 *
 * Type definitions for the missions/quests gamification system.
 */

/**
 * Mission types
 */
export type MissionType = 'daily' | 'weekly' | 'special';

/**
 * Mission status
 */
export type MissionStatus = 'active' | 'in_progress' | 'completed' | 'claimed' | 'expired';

/**
 * Mission difficulty levels
 */
export type MissionDifficulty = 'easy' | 'medium' | 'hard' | 'epic';

/**
 * Objective types
 */
export type ObjectiveType =
  | 'exercises_completed'
  | 'ml_coins_earned'
  | 'modules_completed'
  | 'powerups_used'
  | 'achievements_unlocked'
  | 'perfect_scores'
  | 'streak_maintained'
  | 'friends_helped'
  | 'login_days'
  | 'rank_up'
  | 'guild_joined'
  | 'exercises_no_hints'
  | 'weekly_exercises'
  | 'total_xp_earned';

/**
 * Mission objective
 */
export interface MissionObjective {
  type: ObjectiveType;
  target: number;
  current: number;
  description?: string;
}

/**
 * Mission rewards
 */
export interface MissionRewards {
  ml_coins: number;
  xp: number;
  items?: string[];
}

/**
 * Mission interface (database record)
 */
export interface Mission {
  id: string;
  user_id: string;
  template_id: string;
  title: string;
  description: string;
  mission_type: MissionType;
  objectives: MissionObjective[];
  rewards: MissionRewards;
  status: MissionStatus;
  progress: number;
  start_date: Date;
  end_date: Date;
  completed_at?: Date;
  claimed_at?: Date;
  created_at: Date;
}

/**
 * Mission template
 */
export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  objectives: Omit<MissionObjective, 'current'>[];
  rewards: MissionRewards;
  difficulty: MissionDifficulty;
  icon?: string;
  requirements?: {
    minLevel?: number;
    minRank?: string;
  };
}

/**
 * Mission progress response
 */
export interface MissionProgressResponse {
  mission: Mission;
  percentage: number;
  objectivesCompleted: number;
  totalObjectives: number;
  canClaim: boolean;
  timeRemaining?: number;
}

/**
 * Claim rewards request
 */
export interface ClaimRewardsRequest {
  userId: string;
  missionId: string;
}

/**
 * Update progress request
 */
export interface UpdateProgressRequest {
  userId: string;
  actionType: ObjectiveType;
  amount: number;
  metadata?: any;
}

/**
 * Mission filters
 */
export interface MissionFilters {
  status?: MissionStatus | MissionStatus[];
  type?: MissionType | MissionType[];
  page?: number;
  limit?: number;
}

/**
 * Mission statistics
 */
export interface MissionStats {
  totalMissions: number;
  completedMissions: number;
  claimedMissions: number;
  expiredMissions: number;
  totalRewardsEarned: {
    mlCoins: number;
    xp: number;
  };
  completionRate: number;
  dailyStreak: number;
  weeklyStreak: number;
}

/**
 * Create mission request
 */
export interface CreateMissionRequest {
  userId: string;
  templateId: string;
  missionType: MissionType;
}

/**
 * Mission notification
 */
export interface MissionNotification {
  type: 'mission_completed' | 'mission_claimed' | 'mission_expired' | 'new_missions_available';
  mission: Mission;
  rewards?: MissionRewards;
}
