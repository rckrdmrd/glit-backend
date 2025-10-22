/**
 * Admin Module Types
 *
 * TypeScript interfaces and types for admin functionality.
 */

/**
 * User Admin Interface
 *
 * Extended user information for admin operations.
 */
export interface UserAdmin {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  role: 'student' | 'admin_teacher' | 'super_admin';
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  tenant_id?: string;
  tenant_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  student_id?: string;
  grade_level?: string;
  is_active: boolean;
  last_sign_in_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;

  // Gamification stats
  total_xp?: number;
  current_level?: number;
  current_rank?: string;
  ml_coins?: number;
  total_exercises_completed?: number;

  // Suspension info
  suspension_reason?: string;
  suspension_until?: Date;
  suspended_by?: string;
  suspended_at?: Date;
}

/**
 * User Activity Entry
 *
 * Represents a single user activity log entry.
 */
export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

/**
 * User Filters
 *
 * Filtering options for user list queries.
 */
export interface UserFilters {
  role?: string;
  status?: string;
  is_active?: boolean;
  tenant_id?: string;
  search?: string; // Search by email, name, or student_id
  created_after?: Date;
  created_before?: Date;
  last_login_after?: Date;
  last_login_before?: Date;
}

/**
 * User Update Data
 *
 * Fields that can be updated by admin.
 */
export interface UserUpdateData {
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  role?: 'student' | 'admin_teacher' | 'super_admin';
  tenant_id?: string;
  phone?: string;
  student_id?: string;
  grade_level?: string;
  is_active?: boolean;
  avatar_url?: string;
  bio?: string;
}

/**
 * User Suspension Data
 *
 * Information for suspending a user.
 */
export interface UserSuspensionData {
  reason: string;
  duration_days?: number; // If not provided, indefinite suspension
  suspended_by: string;
}

/**
 * Organization Interface
 *
 * Extended organization/tenant information.
 */
export interface Organization {
  id: string;
  name: string;
  type: 'school' | 'university' | 'company' | 'other';
  country: string;
  state?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  admin_id?: string;
  admin_email?: string;
  admin_name?: string;
  student_count: number;
  teacher_count: number;
  is_active: boolean;
  subscription_tier?: string;
  subscription_expires_at?: Date;
  max_students?: number;
  max_teachers?: number;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Organization Statistics
 *
 * Detailed statistics for an organization.
 */
export interface OrganizationStats {
  organization_id: string;
  organization_name: string;

  // User counts
  total_students: number;
  total_teachers: number;
  active_students_30d: number;
  active_teachers_30d: number;
  new_students_30d: number;

  // Engagement metrics
  total_exercises_completed: number;
  total_xp_earned: number;
  average_student_level: number;
  average_student_xp: number;

  // Activity
  exercises_completed_30d: number;
  exercises_completed_7d: number;
  exercises_completed_today: number;

  // Classrooms
  total_classrooms: number;
  total_assignments: number;
  active_assignments: number;

  calculated_at: Date;
}

/**
 * Flagged Content Interface
 *
 * Content that has been flagged for moderation.
 */
export interface FlaggedContent {
  id: string;
  content_type: 'exercise' | 'comment' | 'profile' | 'post' | 'message';
  content_id: string;
  content_preview?: string;

  reported_by: string;
  reporter_email?: string;
  reporter_name?: string;

  reason: string;
  description?: string;

  status: 'pending' | 'approved' | 'rejected' | 'removed';
  priority: 'high' | 'medium' | 'low';

  reviewed_by?: string;
  reviewer_email?: string;
  reviewed_at?: Date;
  review_notes?: string;

  created_at: Date;
  updated_at: Date;
}

/**
 * System Metrics Interface
 *
 * Real-time system health and performance metrics.
 */
export interface SystemMetrics {
  // API Performance
  api_response_time: {
    p50: number; // 50th percentile (median)
    p95: number; // 95th percentile
    p99: number; // 99th percentile
  };

  // Database
  database_queries_per_sec: number;
  database_connections_active: number;
  database_connections_idle: number;
  database_query_time_avg: number;

  // Users
  active_users_count: number;
  active_users_5min: number;
  active_users_1hour: number;
  total_users_count: number;

  // Traffic
  requests_per_min: number;
  requests_per_hour: number;
  error_rate: number; // Percentage

  // System Resources
  cpu_usage: number; // Percentage
  memory_usage: number; // Percentage
  memory_used_mb: number;
  memory_total_mb: number;

  // Application
  uptime_seconds: number;
  websocket_connections: number;

  timestamp: Date;
}

/**
 * System Log Entry
 *
 * Application log entry for admin viewing.
 */
export interface SystemLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;

  // Context
  service?: string;
  module?: string;
  user_id?: string;

  // Error details
  error?: {
    name: string;
    message: string;
    stack?: string;
  };

  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Admin Action Log Entry
 *
 * Audit trail for admin actions.
 */
export interface AdminAction {
  id: string;
  admin_id: string;
  admin_email?: string;
  admin_name?: string;

  action: string;
  target_type: string;
  target_id?: string;

  description: string;
  details?: Record<string, any>;

  // Changes tracking
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;

  // Request info
  ip_address?: string;
  user_agent?: string;

  // Result
  status: 'success' | 'failure';
  error_message?: string;

  timestamp: Date;
}

/**
 * Pagination Parameters
 *
 * Common pagination params for list queries.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

/**
 * Paginated Response
 *
 * Standard paginated response structure.
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/**
 * Content Moderation Action
 *
 * Action taken on flagged content.
 */
export interface ContentModerationAction {
  content_id: string;
  action: 'approve' | 'reject' | 'remove';
  moderator_id: string;
  reason?: string;
  notes?: string;
  notify_user?: boolean;
}

/**
 * User Export Data
 *
 * User data export for GDPR compliance.
 */
export interface UserExportData {
  user: UserAdmin;
  profile: Record<string, any>;
  stats: Record<string, any>;
  achievements: any[];
  progress: any[];
  transactions: any[];
  activity_log: UserActivity[];
  generated_at: Date;
}

/**
 * Password Reset Request
 *
 * Admin-initiated password reset.
 */
export interface PasswordResetRequest {
  user_id: string;
  initiated_by: string;
  reason?: string;
  notify_user?: boolean;
}

/**
 * Bulk User Action
 *
 * Perform action on multiple users.
 */
export interface BulkUserAction {
  user_ids: string[];
  action: 'activate' | 'deactivate' | 'suspend' | 'delete';
  reason?: string;
  performed_by: string;
}

/**
 * Dashboard Statistics
 *
 * Overview statistics for admin dashboard.
 */
export interface DashboardStats {
  // Users
  total_users: number;
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  active_users_today: number;

  // Organizations
  total_organizations: number;
  active_organizations: number;

  // Content
  flagged_content_pending: number;
  flagged_content_total: number;

  // Activity
  exercises_completed_today: number;
  exercises_completed_this_week: number;

  // System
  system_health: 'healthy' | 'degraded' | 'critical';
  error_rate_24h: number;

  generated_at: Date;
}
