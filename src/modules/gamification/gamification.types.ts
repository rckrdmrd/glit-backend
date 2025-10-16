/**
 * Gamification Module Types
 *
 * Complete TypeScript interfaces for gamification system (EPIC-004).
 */

// ============================================================================
// LEGACY TYPES (Compatibility)
// ============================================================================

/**
 * Add ML Coins Request DTO (Legacy)
 */
export interface AddMLCoinsDto {
  userId: string;
  amount: number;
  reason: string;
  transactionType: string;
  referenceId?: string;
}

/**
 * Unlock Achievement Request DTO
 */
export interface UnlockAchievementDto {
  userId: string;
  achievementId: string;
  progress?: number;
}

/**
 * User Stats Response
 */
export interface UserStatsResponse {
  userId: string;
  mlCoins: number;
  mlCoinsEarnedTotal: number;
  mlCoinsSpentTotal: number;
  totalXP: number;
  currentLevel: number;
  currentRank: string;
  rankProgress: number;
  streakDays: number;
  longestStreak: number;
  lastLoginAt: Date | null;
  totalExercisesCompleted: number;
  perfectScores: number;
  averageScore: number;
  updatedAt: Date;
}

/**
 * Achievement Response
 */
export interface AchievementResponse {
  id: string;
  userId: string;
  achievementId: string;
  achievement: {
    name: string;
    description: string;
    icon: string;
    rarity: string;
    mlCoinsReward: number;
  };
  unlockedAt: Date;
  progress: number;
}

// ============================================================================
// MAYA RANKS SYSTEM TYPES
// ============================================================================

/**
 * Maya rank names
 */
export type MayaRank = 'nacom' | 'batab' | 'holcatte' | 'guerrero' | 'mercenario';

/**
 * Rank requirements
 */
export interface RankRequirements {
  rank: MayaRank;
  xpRequired: number;
  modulesRequired: number;
  mlCoinsThreshold: number;
  achievementsRequired: number;
  minimumScore: number;
  multiplier: number;
  mlBonus: number;
}

/**
 * User rank info response
 */
export interface UserRankInfo {
  currentRank: {
    rank: MayaRank;
    multiplier: number;
    achievedAt: Date;
    mlCoinsBonus: number;
    certificateUrl: string | null;
    badgeUrl: string | null;
  };
  nextRank: {
    rank: MayaRank;
    requirements: {
      xpRequired: number;
      modulesRequired: number;
      mlCoinsThreshold: number;
      achievementsRequired: number;
      minimumScore: number;
    };
    rewards: {
      multiplier: number;
      mlBonus: number;
    };
  } | null;
  progress: {
    percentage: number;
    currentXP: number;
    currentModules: number;
    currentMLCoins: number;
    currentAchievements: number;
    currentScore: number;
  };
}

/**
 * Promotion check result
 */
export interface PromotionCheck {
  canPromote: boolean;
  currentRank: MayaRank;
  nextRank: MayaRank | null;
  missingRequirements: string[];
}

// ============================================================================
// ML COINS ECONOMY TYPES
// ============================================================================

/**
 * Transaction types
 */
export type TransactionType =
  | 'earned_exercise'
  | 'earned_module'
  | 'earned_achievement'
  | 'earned_rank'
  | 'earned_streak'
  | 'earned_daily'
  | 'earned_bonus'
  | 'spent_powerup'
  | 'spent_hint'
  | 'spent_retry'
  | 'admin_adjustment'
  | 'refund'
  | 'bonus'
  | 'welcome_bonus';

/**
 * Earn coins request
 */
export interface EarnCoinsRequest {
  userId: string;
  amount: number;
  reason: string;
  transactionType: TransactionType;
  referenceId?: string;
  referenceType?: string;
  multiplier?: number;
  metadata?: any;
}

/**
 * Spend coins request
 */
export interface SpendCoinsRequest {
  userId: string;
  amount: number;
  item: string;
  transactionType: TransactionType;
  referenceId?: string;
  referenceType?: string;
  metadata?: any;
}

/**
 * ML Coins balance response
 */
export interface MLCoinsBalance {
  userId: string;
  balance: number;
  earnedTotal: number;
  spentTotal: number;
  earnedToday: number;
}

/**
 * Transaction response
 */
export interface TransactionResponse {
  id: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  type: TransactionType;
  description: string | null;
  reason: string | null;
  referenceId: string | null;
  multiplier: number;
  bonusApplied: boolean;
  createdAt: Date;
}

/**
 * Earning statistics
 */
export interface EarningStats {
  totalEarnTransactions: number;
  totalSpendTransactions: number;
  totalEarned: number;
  totalSpent: number;
  avgEarnedPerTransaction: number;
  avgSpentPerTransaction: number;
  highestEarning: number;
  highestSpending: number;
}

/**
 * Economic metrics (admin)
 */
export interface EconomicMetrics {
  totalInCirculation: number;
  totalEarned: number;
  totalSpent: number;
  avgBalancePerUser: number;
  totalUsers: number;
  spendingRate: number;
  inflationRate: number;
}

// ============================================================================
// ACHIEVEMENTS SYSTEM TYPES
// ============================================================================

/**
 * Achievement categories
 */
export type AchievementCategory =
  | 'progress'
  | 'streak'
  | 'completion'
  | 'social'
  | 'special'
  | 'mastery'
  | 'exploration';

/**
 * Achievement rarities
 */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  rarity: AchievementRarity;
  mlCoinsReward: number;
  xpReward: number;
  isSecret: boolean;
  conditions: any;
  createdAt: Date;
}

// ============================================================================
// POWER-UPS SYSTEM TYPES
// ============================================================================

/**
 * Power-up types
 */
export type PowerupType = 'pistas' | 'vision_lectora' | 'segunda_oportunidad';

/**
 * Power-up inventory
 */
export interface PowerupInventory {
  pistas: {
    available: number;
    purchased: number;
    used: number;
    cost: number;
  };
  visionLectora: {
    available: number;
    purchased: number;
    used: number;
    cost: number;
  };
  segundaOportunidad: {
    available: number;
    purchased: number;
    used: number;
    cost: number;
  };
}

/**
 * Purchase powerup request
 */
export interface PurchasePowerupRequest {
  userId: string;
  powerupType: PowerupType;
  quantity: number;
}

/**
 * Use powerup request
 */
export interface UsePowerupRequest {
  userId: string;
  powerupType: PowerupType;
  exerciseId: string;
}

/**
 * Available powerup definition
 */
export interface AvailablePowerup {
  type: PowerupType;
  name: string;
  description: string;
  cost: number;
  limit: number;
  icon: string;
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  position: number;
  userId: string;
  name: string;
  xp?: number;
  mlCoins?: number;
  modulesCompleted?: number;
  achievementsEarned?: number;
  streak?: number;
  rank?: MayaRank;
  weeklyXp?: number;
}

/**
 * User position
 */
export interface UserPosition {
  userId: string;
  globalPosition: number;
  totalUsers: number;
  xp: number;
  mlCoins: number;
}
