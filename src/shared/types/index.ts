/**
 * Shared TypeScript Types
 *
 * Common interfaces and types used across the application.
 */

import { Request } from 'express';
import { PoolClient } from 'pg';

/**
 * User Interface (from auth.users table)
 */
export interface User {
  id: string;
  email: string;
  encrypted_password: string;
  role: 'student' | 'admin_teacher' | 'super_admin';
  raw_user_meta_data?: any;
  created_at: Date;
  updated_at: Date;
  last_sign_in_at?: Date;
  email_confirmed_at?: Date;
  confirmation_token?: string;
  confirmation_sent_at?: Date;
  recovery_token?: string;
  recovery_sent_at?: Date;
  email_change_token_new?: string;
  email_change?: string;
  email_change_sent_at?: Date;
  phone?: string;
  phone_confirmed_at?: Date;
  phone_change?: string;
  phone_change_token?: string;
  phone_change_sent_at?: Date;
  reauthentication_token?: string;
  reauthentication_sent_at?: Date;
  is_sso_user: boolean;
  deleted_at?: Date;
}

/**
 * User Profile Interface (from auth_management.profiles table)
 */
export interface UserProfile {
  id: string;
  user_id: string;
  tenant_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  student_id?: string;
  grade_level?: string;
  school_id?: string;
  is_active: boolean;
  preferences?: any;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

/**
 * Authenticated User (stored in request object)
 */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  rank?: string;
  tenant_id?: string;
}

/**
 * Express Request with User
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
  userPermissions?: readonly string[];
  dbClient?: PoolClient;
}

/**
 * API Response Interface
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Pagination Params
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * User Stats Interface (from gamification_system.user_stats)
 */
export interface UserStats {
  user_id: string;
  ml_coins: number;
  ml_coins_earned_total: number;
  ml_coins_spent_total: number;
  total_xp: number;
  current_level: number;
  current_rank: 'nacom' | 'batab' | 'holcatte' | 'guerrero' | 'mercenario';
  rank_progress: number;
  streak_days: number;
  longest_streak: number;
  last_login_at?: Date;
  total_exercises_completed: number;
  perfect_scores: number;
  average_score: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Achievement Interface
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  ml_coins_reward: number;
  xp_reward: number;
  conditions?: any;
  is_secret: boolean;
  created_at: Date;
}

/**
 * User Achievement Interface
 */
export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: Date;
  progress: number;
}

/**
 * ML Coins Transaction Interface
 */
export interface MLCoinsTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reason: string;
  reference_id?: string;
  balance_after: number;
  created_at: Date;
}

/**
 * Error Codes
 */
export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',

  // Authorization
  FORBIDDEN = 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WEAK_PASSWORD = 'WEAK_PASSWORD',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',

  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}
