/**
 * Authentication Module Types
 *
 * TypeScript interfaces for authentication module.
 */

/**
 * Registration Request DTO
 */
export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'student' | 'admin_teacher';
}

/**
 * Login Request DTO
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * Refresh Token Request DTO
 */
export interface RefreshTokenDto {
  refreshToken: string;
}

/**
 * Update Password Request DTO
 */
export interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * Authentication Response
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
  token: string;
  refreshToken?: string;
  expiresIn: string;
}

/**
 * User creation data
 */
export interface CreateUserData {
  email: string;
  password: string;
  role?: string;
  metadata?: any;
}

/**
 * Forgot Password Request DTO
 */
export interface ForgotPasswordDto {
  email: string;
}

/**
 * Reset Password Request DTO
 */
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

/**
 * Verify Email Request DTO
 */
export interface VerifyEmailDto {
  token: string;
}

/**
 * Resend Verification Request DTO
 */
export interface ResendVerificationDto {
  email?: string;
}

/**
 * Session Info Response
 */
export interface SessionInfoDto {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActivity: string;
  isCurrent: boolean;
}
