/**
 * Authentication Repository
 *
 * Database access layer for authentication operations.
 * Implements Repository Pattern for user data access.
 */

import { Pool, PoolClient } from 'pg';
import { User, UserProfile } from '../../shared/types';
import { CreateUserData } from './auth.types';
import { log } from '../../shared/utils/logger';

export class AuthRepository {
  constructor(private pool: Pool) {}

  /**
   * Find user by email
   *
   * @param email - User email
   * @returns User object or null if not found
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.pool.query<User>(
        'SELECT * FROM auth.users WHERE email = $1 AND deleted_at IS NULL',
        [email.toLowerCase()]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   *
   * @param userId - User ID
   * @returns User object or null if not found
   */
  async findUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.pool.query<User>(
        'SELECT * FROM auth.users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Create new user
   *
   * @param userData - User creation data
   * @returns Created user object
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create user in auth.users table
      const userResult = await client.query<User>(
        `INSERT INTO auth.users (
          email,
          encrypted_password,
          role,
          raw_user_meta_data,
          email_confirmed_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *`,
        [
          userData.email.toLowerCase(),
          userData.password,
          userData.role || 'student',
          userData.metadata || {},
        ]
      );

      const user = userResult.rows[0];

      // Get or create default tenant for development
      const tenantResult = await client.query(
        `SELECT id FROM auth_management.tenants WHERE slug = 'escuela-demo' LIMIT 1`
      );
      const tenantId = tenantResult.rows[0]?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      // Create user profile in auth_management.profiles table and get the profile ID
      const profileResult = await client.query(
        `INSERT INTO auth_management.profiles (
          user_id,
          tenant_id,
          email,
          full_name,
          display_name,
          role
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          user.id,
          tenantId,
          userData.email.toLowerCase(),
          userData.metadata?.fullName || userData.metadata?.name || null,
          userData.metadata?.displayName || userData.email.split('@')[0],
          userData.role || 'student',
        ]
      );

      const profileId = profileResult.rows[0].id;

      // Initialize user stats in gamification_system.user_stats
      await client.query(
        `INSERT INTO gamification_system.user_stats (
          user_id,
          ml_coins,
          tenant_id
        )
        VALUES ($1, 100, $2)
        ON CONFLICT (user_id) DO NOTHING`,
        [profileId, tenantId]
      );

      // Initialize user rank in gamification_system.user_ranks
      await client.query(
        `INSERT INTO gamification_system.user_ranks (
          user_id,
          tenant_id,
          current_rank,
          is_current
        )
        VALUES ($1, $2, 'nacom', true)
        ON CONFLICT (user_id, current_rank) DO NOTHING`,
        [profileId, tenantId]
      );

      await client.query('COMMIT');

      log.info(`User created: ${user.email} (${user.id})`);
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user last sign in timestamp
   *
   * @param userId - User ID
   */
  async updateLastSignIn(userId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE auth.users SET last_sign_in_at = NOW(), updated_at = NOW() WHERE id = $1',
        [userId]
      );

      // Update gamification stats last login
      await this.pool.query(
        'UPDATE gamification_system.user_stats SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      log.error('Error updating last sign in:', error);
      throw error;
    }
  }

  /**
   * Update user password
   *
   * @param userId - User ID
   * @param hashedPassword - New hashed password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );

      log.info(`Password updated for user: ${userId}`);
    } catch (error) {
      log.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   *
   * @param userId - User ID
   * @returns User profile or null
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await this.pool.query<UserProfile>(
        'SELECT * FROM auth_management.profiles WHERE user_id = $1',
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   *
   * @param userId - User ID
   * @param profileData - Profile update data
   */
  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic UPDATE query
      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'user_id') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(userId);

      const result = await this.pool.query<UserProfile>(
        `UPDATE auth_management.profiles
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE user_id = $${paramIndex}
         RETURNING *`,
        values
      );

      return result.rows[0];
    } catch (error) {
      log.error('Error updating profile:', error);
      throw error;
    }
  }
}
