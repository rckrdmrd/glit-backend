/**
 * Authentication Permissions
 *
 * Permission definitions and constants for the GLIT Platform.
 * Implements granular permission system for RBAC.
 */

/**
 * Permission types organized by domain
 */
export const Permissions = {
  // User Management Permissions
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_LIST: 'users.list',
  USERS_MANAGE_ROLES: 'users.manage_roles',

  // Classroom Management Permissions
  CLASSROOMS_CREATE: 'classrooms.create',
  CLASSROOMS_READ: 'classrooms.read',
  CLASSROOMS_UPDATE: 'classrooms.update',
  CLASSROOMS_DELETE: 'classrooms.delete',
  CLASSROOMS_MANAGE_STUDENTS: 'classrooms.manage_students',
  CLASSROOMS_VIEW_ANALYTICS: 'classrooms.view_analytics',

  // Exercise Permissions
  EXERCISES_CREATE: 'exercises.create',
  EXERCISES_READ: 'exercises.read',
  EXERCISES_UPDATE: 'exercises.update',
  EXERCISES_DELETE: 'exercises.delete',
  EXERCISES_SUBMIT: 'exercises.submit',
  EXERCISES_VIEW_SOLUTIONS: 'exercises.view_solutions',

  // Module Permissions
  MODULES_CREATE: 'modules.create',
  MODULES_READ: 'modules.read',
  MODULES_UPDATE: 'modules.update',
  MODULES_DELETE: 'modules.delete',
  MODULES_PUBLISH: 'modules.publish',

  // Gamification Permissions
  ACHIEVEMENTS_MANAGE: 'achievements.manage',
  COINS_MANAGE: 'coins.manage',
  COINS_ADJUST: 'coins.adjust',
  RANKS_MANAGE: 'ranks.manage',
  POWERUPS_USE: 'powerups.use',
  LEADERBOARD_VIEW: 'leaderboard.view',

  // Progress & Analytics Permissions
  PROGRESS_VIEW_OWN: 'progress.view_own',
  PROGRESS_VIEW_ALL: 'progress.view_all',
  ANALYTICS_VIEW: 'analytics.view',
  REPORTS_VIEW: 'reports.view',
  REPORTS_GENERATE: 'reports.generate',

  // Content Permissions
  CONTENT_UPLOAD: 'content.upload',
  CONTENT_DELETE: 'content.delete',
  CONTENT_MODERATE: 'content.moderate',

  // System Administration
  SYSTEM_ADMIN: 'system.admin',
  SYSTEM_CONFIG: 'system.config',
  SYSTEM_AUDIT_VIEW: 'system.audit_view',
} as const;

/**
 * Permission groups by role
 */
export const RolePermissions = {
  student: [
    // Students can view and interact with their own content
    Permissions.USERS_READ,
    Permissions.CLASSROOMS_READ,
    Permissions.EXERCISES_READ,
    Permissions.EXERCISES_SUBMIT,
    Permissions.MODULES_READ,
    Permissions.POWERUPS_USE,
    Permissions.LEADERBOARD_VIEW,
    Permissions.PROGRESS_VIEW_OWN,
    Permissions.CONTENT_UPLOAD, // For assignments
  ],

  admin_teacher: [
    // Teachers have most permissions except system-level
    Permissions.USERS_READ,
    Permissions.USERS_LIST,
    Permissions.CLASSROOMS_CREATE,
    Permissions.CLASSROOMS_READ,
    Permissions.CLASSROOMS_UPDATE,
    Permissions.CLASSROOMS_DELETE,
    Permissions.CLASSROOMS_MANAGE_STUDENTS,
    Permissions.CLASSROOMS_VIEW_ANALYTICS,
    Permissions.EXERCISES_CREATE,
    Permissions.EXERCISES_READ,
    Permissions.EXERCISES_UPDATE,
    Permissions.EXERCISES_DELETE,
    Permissions.EXERCISES_VIEW_SOLUTIONS,
    Permissions.MODULES_CREATE,
    Permissions.MODULES_READ,
    Permissions.MODULES_UPDATE,
    Permissions.MODULES_DELETE,
    Permissions.MODULES_PUBLISH,
    Permissions.ACHIEVEMENTS_MANAGE,
    Permissions.COINS_MANAGE,
    Permissions.COINS_ADJUST,
    Permissions.RANKS_MANAGE,
    Permissions.POWERUPS_USE,
    Permissions.LEADERBOARD_VIEW,
    Permissions.PROGRESS_VIEW_OWN,
    Permissions.PROGRESS_VIEW_ALL,
    Permissions.ANALYTICS_VIEW,
    Permissions.REPORTS_VIEW,
    Permissions.REPORTS_GENERATE,
    Permissions.CONTENT_UPLOAD,
    Permissions.CONTENT_DELETE,
    Permissions.CONTENT_MODERATE,
  ],

  super_admin: [
    // Super admins have all permissions
    ...Object.values(Permissions),
  ],
} as const;

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: string): readonly string[] {
  switch (role) {
    case 'student':
      return RolePermissions.student;
    case 'admin_teacher':
      return RolePermissions.admin_teacher;
    case 'super_admin':
      return RolePermissions.super_admin;
    default:
      return [];
  }
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: string, permissions: string[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.some((p) => rolePermissions.includes(p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: string, permissions: string[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.every((p) => rolePermissions.includes(p));
}

/**
 * Permission categories for UI display
 */
export const PermissionCategories = {
  'User Management': [
    Permissions.USERS_CREATE,
    Permissions.USERS_READ,
    Permissions.USERS_UPDATE,
    Permissions.USERS_DELETE,
    Permissions.USERS_LIST,
    Permissions.USERS_MANAGE_ROLES,
  ],
  'Classroom Management': [
    Permissions.CLASSROOMS_CREATE,
    Permissions.CLASSROOMS_READ,
    Permissions.CLASSROOMS_UPDATE,
    Permissions.CLASSROOMS_DELETE,
    Permissions.CLASSROOMS_MANAGE_STUDENTS,
    Permissions.CLASSROOMS_VIEW_ANALYTICS,
  ],
  'Educational Content': [
    Permissions.EXERCISES_CREATE,
    Permissions.EXERCISES_READ,
    Permissions.EXERCISES_UPDATE,
    Permissions.EXERCISES_DELETE,
    Permissions.EXERCISES_SUBMIT,
    Permissions.EXERCISES_VIEW_SOLUTIONS,
    Permissions.MODULES_CREATE,
    Permissions.MODULES_READ,
    Permissions.MODULES_UPDATE,
    Permissions.MODULES_DELETE,
    Permissions.MODULES_PUBLISH,
  ],
  'Gamification': [
    Permissions.ACHIEVEMENTS_MANAGE,
    Permissions.COINS_MANAGE,
    Permissions.COINS_ADJUST,
    Permissions.RANKS_MANAGE,
    Permissions.POWERUPS_USE,
    Permissions.LEADERBOARD_VIEW,
  ],
  'Analytics & Reports': [
    Permissions.PROGRESS_VIEW_OWN,
    Permissions.PROGRESS_VIEW_ALL,
    Permissions.ANALYTICS_VIEW,
    Permissions.REPORTS_VIEW,
    Permissions.REPORTS_GENERATE,
  ],
  'Content Management': [
    Permissions.CONTENT_UPLOAD,
    Permissions.CONTENT_DELETE,
    Permissions.CONTENT_MODERATE,
  ],
  'System Administration': [
    Permissions.SYSTEM_ADMIN,
    Permissions.SYSTEM_CONFIG,
    Permissions.SYSTEM_AUDIT_VIEW,
  ],
} as const;

/**
 * Permission descriptions for documentation
 */
export const PermissionDescriptions: Record<string, string> = {
  [Permissions.USERS_CREATE]: 'Create new users',
  [Permissions.USERS_READ]: 'View user information',
  [Permissions.USERS_UPDATE]: 'Update user information',
  [Permissions.USERS_DELETE]: 'Delete users',
  [Permissions.USERS_LIST]: 'List all users',
  [Permissions.USERS_MANAGE_ROLES]: 'Assign and manage user roles',

  [Permissions.CLASSROOMS_CREATE]: 'Create new classrooms',
  [Permissions.CLASSROOMS_READ]: 'View classroom information',
  [Permissions.CLASSROOMS_UPDATE]: 'Update classroom settings',
  [Permissions.CLASSROOMS_DELETE]: 'Delete classrooms',
  [Permissions.CLASSROOMS_MANAGE_STUDENTS]: 'Add/remove students from classrooms',
  [Permissions.CLASSROOMS_VIEW_ANALYTICS]: 'View classroom analytics and statistics',

  [Permissions.EXERCISES_CREATE]: 'Create new exercises',
  [Permissions.EXERCISES_READ]: 'View exercises',
  [Permissions.EXERCISES_UPDATE]: 'Update exercise content',
  [Permissions.EXERCISES_DELETE]: 'Delete exercises',
  [Permissions.EXERCISES_SUBMIT]: 'Submit exercise answers',
  [Permissions.EXERCISES_VIEW_SOLUTIONS]: 'View correct answers and solutions',

  [Permissions.MODULES_CREATE]: 'Create new learning modules',
  [Permissions.MODULES_READ]: 'View module content',
  [Permissions.MODULES_UPDATE]: 'Update module content',
  [Permissions.MODULES_DELETE]: 'Delete modules',
  [Permissions.MODULES_PUBLISH]: 'Publish/unpublish modules',

  [Permissions.ACHIEVEMENTS_MANAGE]: 'Create and manage achievements',
  [Permissions.COINS_MANAGE]: 'Manage ML Coins system',
  [Permissions.COINS_ADJUST]: 'Manually adjust user ML Coins',
  [Permissions.RANKS_MANAGE]: 'Manage Maya ranks system',
  [Permissions.POWERUPS_USE]: 'Use power-ups during exercises',
  [Permissions.LEADERBOARD_VIEW]: 'View leaderboards',

  [Permissions.PROGRESS_VIEW_OWN]: 'View own progress and statistics',
  [Permissions.PROGRESS_VIEW_ALL]: 'View progress of all users',
  [Permissions.ANALYTICS_VIEW]: 'View analytics dashboards',
  [Permissions.REPORTS_VIEW]: 'View generated reports',
  [Permissions.REPORTS_GENERATE]: 'Generate new reports',

  [Permissions.CONTENT_UPLOAD]: 'Upload media content',
  [Permissions.CONTENT_DELETE]: 'Delete uploaded content',
  [Permissions.CONTENT_MODERATE]: 'Moderate user-generated content',

  [Permissions.SYSTEM_ADMIN]: 'Full system administration access',
  [Permissions.SYSTEM_CONFIG]: 'Modify system configuration',
  [Permissions.SYSTEM_AUDIT_VIEW]: 'View audit logs and security events',
};
