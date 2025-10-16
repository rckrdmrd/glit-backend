/**
 * Guilds Repository
 *
 * Database access layer for guild (teams) operations.
 */

import { Pool, PoolClient } from 'pg';
import { Guild, GuildMember, GuildChallenge, CreateGuildDto, UpdateGuildDto, CreateGuildChallengeDto, GuildMemberProfile, GuildLeaderboardEntry } from './guilds.types';
import { log } from '../../../shared/utils/logger';

export class GuildsRepository {
  constructor(private pool: Pool) {}

  /**
   * Ensure team_members table exists
   */
  async ensureTeamMembersTable(client?: PoolClient): Promise<void> {
    const db = client || this.pool;

    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS social_features.team_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          team_id UUID NOT NULL REFERENCES social_features.teams(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth_management.profiles(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'kicked', 'left')),
          joined_at TIMESTAMPTZ DEFAULT NOW(),
          left_at TIMESTAMPTZ,
          kicked_at TIMESTAMPTZ,
          kick_reason TEXT,
          contribution_xp INTEGER DEFAULT 0,
          contribution_coins INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(team_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_team_members_team ON social_features.team_members(team_id);
        CREATE INDEX IF NOT EXISTS idx_team_members_user ON social_features.team_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_team_members_role ON social_features.team_members(role);
        CREATE INDEX IF NOT EXISTS idx_team_members_status ON social_features.team_members(status);

        CREATE TABLE IF NOT EXISTS social_features.team_challenges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          team_id UUID NOT NULL REFERENCES social_features.teams(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          challenge_type TEXT NOT NULL CHECK (challenge_type IN ('xp_goal', 'modules_completion', 'achievement_hunt', 'custom')),
          target_value INTEGER NOT NULL,
          current_value INTEGER DEFAULT 0,
          reward_xp INTEGER DEFAULT 0,
          reward_coins INTEGER DEFAULT 0,
          start_date TIMESTAMPTZ DEFAULT NOW(),
          end_date TIMESTAMPTZ NOT NULL,
          is_active BOOLEAN DEFAULT true,
          is_completed BOOLEAN DEFAULT false,
          completed_at TIMESTAMPTZ,
          created_by UUID NOT NULL REFERENCES auth_management.profiles(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_team_challenges_team ON social_features.team_challenges(team_id);
        CREATE INDEX IF NOT EXISTS idx_team_challenges_active ON social_features.team_challenges(is_active) WHERE is_active = true;
      `);
    } catch (error) {
      log.debug('Team members/challenges table setup:', error);
    }
  }

  /**
   * Create new guild
   */
  async createGuild(userId: string, dto: CreateGuildDto, tenantId: string, dbClient?: PoolClient): Promise<Guild> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      // Create guild
      const result = await client.query<Guild>(
        `INSERT INTO social_features.teams (
          tenant_id,
          name,
          description,
          motto,
          color_primary,
          color_secondary,
          creator_id,
          leader_id,
          max_members,
          is_public,
          allow_join_requests,
          require_approval,
          team_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          tenantId,
          dto.name,
          dto.description || null,
          dto.motto || null,
          dto.colorPrimary || '#3B82F6',
          dto.colorSecondary || '#10B981',
          userId,
          dto.maxMembers || 20,
          dto.isPublic !== undefined ? dto.isPublic : false,
          dto.allowJoinRequests !== undefined ? dto.allowJoinRequests : true,
          dto.requireApproval !== undefined ? dto.requireApproval : true,
          this.generateTeamCode(),
        ]
      );

      const guild = result.rows[0];

      // Add creator as owner
      await client.query(
        `INSERT INTO social_features.team_members (team_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')`,
        [guild.id, userId]
      );

      // Update member count
      await client.query(
        `UPDATE social_features.teams SET current_members_count = 1 WHERE id = $1`,
        [guild.id]
      );

      await client.query('COMMIT');

      log.info(`Guild created: ${guild.name} (${guild.id}) by user ${userId}`);
      return guild;
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error creating guild:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Get guild by ID
   */
  async getGuildById(guildId: string, dbClient?: PoolClient): Promise<Guild | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Guild>(
        'SELECT * FROM social_features.teams WHERE id = $1 AND is_active = true',
        [guildId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting guild by ID:', error);
      throw error;
    }
  }

  /**
   * Get all public guilds
   */
  async getPublicGuilds(limit: number = 50, offset: number = 0, dbClient?: PoolClient): Promise<Guild[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Guild>(
        `SELECT * FROM social_features.teams
         WHERE is_public = true AND is_active = true
         ORDER BY total_xp DESC, current_members_count DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting public guilds:', error);
      throw error;
    }
  }

  /**
   * Search guilds by name
   */
  async searchGuilds(searchQuery: string, limit: number = 20, dbClient?: PoolClient): Promise<Guild[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Guild>(
        `SELECT * FROM social_features.teams
         WHERE (name ILIKE $1 OR description ILIKE $1)
           AND is_public = true
           AND is_active = true
         ORDER BY total_xp DESC
         LIMIT $2`,
        [`%${searchQuery}%`, limit]
      );

      return result.rows;
    } catch (error) {
      log.error('Error searching guilds:', error);
      throw error;
    }
  }

  /**
   * Update guild
   */
  async updateGuild(guildId: string, dto: UpdateGuildDto, dbClient?: PoolClient): Promise<Guild> {
    try {
      const client = dbClient || this.pool;

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.name !== undefined) {
        fields.push(`name = $${paramIndex}`);
        values.push(dto.name);
        paramIndex++;
      }
      if (dto.description !== undefined) {
        fields.push(`description = $${paramIndex}`);
        values.push(dto.description);
        paramIndex++;
      }
      if (dto.motto !== undefined) {
        fields.push(`motto = $${paramIndex}`);
        values.push(dto.motto);
        paramIndex++;
      }
      if (dto.colorPrimary !== undefined) {
        fields.push(`color_primary = $${paramIndex}`);
        values.push(dto.colorPrimary);
        paramIndex++;
      }
      if (dto.colorSecondary !== undefined) {
        fields.push(`color_secondary = $${paramIndex}`);
        values.push(dto.colorSecondary);
        paramIndex++;
      }
      if (dto.avatarUrl !== undefined) {
        fields.push(`avatar_url = $${paramIndex}`);
        values.push(dto.avatarUrl);
        paramIndex++;
      }
      if (dto.bannerUrl !== undefined) {
        fields.push(`banner_url = $${paramIndex}`);
        values.push(dto.bannerUrl);
        paramIndex++;
      }
      if (dto.maxMembers !== undefined) {
        fields.push(`max_members = $${paramIndex}`);
        values.push(dto.maxMembers);
        paramIndex++;
      }
      if (dto.isPublic !== undefined) {
        fields.push(`is_public = $${paramIndex}`);
        values.push(dto.isPublic);
        paramIndex++;
      }
      if (dto.allowJoinRequests !== undefined) {
        fields.push(`allow_join_requests = $${paramIndex}`);
        values.push(dto.allowJoinRequests);
        paramIndex++;
      }
      if (dto.requireApproval !== undefined) {
        fields.push(`require_approval = $${paramIndex}`);
        values.push(dto.requireApproval);
        paramIndex++;
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(guildId);

      const result = await client.query<Guild>(
        `UPDATE social_features.teams
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Guild not found');
      }

      log.info(`Guild updated: ${guildId}`);
      return result.rows[0];
    } catch (error) {
      log.error('Error updating guild:', error);
      throw error;
    }
  }

  /**
   * Delete guild
   */
  async deleteGuild(guildId: string, dbClient?: PoolClient): Promise<void> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `UPDATE social_features.teams
         SET is_active = false, updated_at = NOW()
         WHERE id = $1`,
        [guildId]
      );

      if (result.rowCount === 0) {
        throw new Error('Guild not found');
      }

      log.info(`Guild deleted: ${guildId}`);
    } catch (error) {
      log.error('Error deleting guild:', error);
      throw error;
    }
  }

  /**
   * Get guild members
   */
  async getGuildMembers(guildId: string, dbClient?: PoolClient): Promise<GuildMemberProfile[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          tm.id,
          tm.user_id,
          tm.role,
          tm.joined_at,
          tm.contribution_xp,
          tm.contribution_coins,
          p.display_name,
          p.avatar_url,
          p.full_name,
          us.current_rank,
          us.last_login_at
         FROM social_features.team_members tm
         JOIN auth_management.profiles p ON tm.user_id = p.id
         LEFT JOIN gamification_system.user_stats us ON p.id = us.user_id
         WHERE tm.team_id = $1 AND tm.status = 'active'
         ORDER BY
           CASE tm.role
             WHEN 'owner' THEN 1
             WHEN 'admin' THEN 2
             WHEN 'member' THEN 3
           END,
           tm.contribution_xp DESC`,
        [guildId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        displayName: row.display_name || row.full_name || 'Usuario',
        avatarUrl: row.avatar_url,
        currentRank: row.current_rank,
        role: row.role,
        contributionXP: row.contribution_xp,
        contributionCoins: row.contribution_coins,
        joinedAt: row.joined_at,
        isOnline: row.last_login_at && (Date.now() - new Date(row.last_login_at).getTime()) < 5 * 60 * 1000,
      }));
    } catch (error) {
      log.error('Error getting guild members:', error);
      throw error;
    }
  }

  /**
   * Check if user is member of guild
   */
  async checkMembership(guildId: string, userId: string, dbClient?: PoolClient): Promise<GuildMember | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<GuildMember>(
        `SELECT * FROM social_features.team_members
         WHERE team_id = $1 AND user_id = $2 AND status = 'active'`,
        [guildId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error checking guild membership:', error);
      throw error;
    }
  }

  /**
   * Add member to guild
   */
  async addMember(guildId: string, userId: string, role: 'admin' | 'member' = 'member', dbClient?: PoolClient): Promise<GuildMember> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      const result = await client.query<GuildMember>(
        `INSERT INTO social_features.team_members (team_id, user_id, role, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING *`,
        [guildId, userId, role]
      );

      // Update member count
      await client.query(
        `UPDATE social_features.teams
         SET current_members_count = current_members_count + 1,
             last_activity_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [guildId]
      );

      await client.query('COMMIT');

      log.info(`Member added to guild ${guildId}: ${userId}`);
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error adding member to guild:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Remove member from guild
   */
  async removeMember(guildId: string, userId: string, dbClient?: PoolClient): Promise<void> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE social_features.team_members
         SET status = 'left', left_at = NOW(), updated_at = NOW()
         WHERE team_id = $1 AND user_id = $2 AND status = 'active'`,
        [guildId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Member not found in guild');
      }

      // Update member count
      await client.query(
        `UPDATE social_features.teams
         SET current_members_count = GREATEST(current_members_count - 1, 0),
             updated_at = NOW()
         WHERE id = $1`,
        [guildId]
      );

      await client.query('COMMIT');

      log.info(`Member removed from guild ${guildId}: ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error removing member from guild:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(guildId: string, userId: string, newRole: 'admin' | 'member', dbClient?: PoolClient): Promise<void> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `UPDATE social_features.team_members
         SET role = $3, updated_at = NOW()
         WHERE team_id = $1 AND user_id = $2 AND status = 'active'`,
        [guildId, userId, newRole]
      );

      if (result.rowCount === 0) {
        throw new Error('Member not found in guild');
      }

      log.info(`Member role updated in guild ${guildId}: ${userId} -> ${newRole}`);
    } catch (error) {
      log.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Get guild challenges
   */
  async getGuildChallenges(guildId: string, dbClient?: PoolClient): Promise<GuildChallenge[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<GuildChallenge>(
        `SELECT * FROM social_features.team_challenges
         WHERE team_id = $1
         ORDER BY is_active DESC, end_date ASC`,
        [guildId]
      );

      return result.rows;
    } catch (error) {
      log.error('Error getting guild challenges:', error);
      throw error;
    }
  }

  /**
   * Create guild challenge
   */
  async createChallenge(guildId: string, userId: string, dto: CreateGuildChallengeDto, dbClient?: PoolClient): Promise<GuildChallenge> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<GuildChallenge>(
        `INSERT INTO social_features.team_challenges (
          team_id,
          title,
          description,
          challenge_type,
          target_value,
          reward_xp,
          reward_coins,
          start_date,
          end_date,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          guildId,
          dto.title,
          dto.description || null,
          dto.challengeType,
          dto.targetValue,
          dto.rewardXp,
          dto.rewardCoins,
          dto.startDate,
          dto.endDate,
          userId,
        ]
      );

      log.info(`Guild challenge created: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      log.error('Error creating guild challenge:', error);
      throw error;
    }
  }

  /**
   * Get guild leaderboard
   */
  async getGuildLeaderboard(limit: number = 50, dbClient?: PoolClient): Promise<GuildLeaderboardEntry[]> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query(
        `SELECT
          ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank,
          id as guild_id,
          name as guild_name,
          avatar_url,
          total_xp,
          total_ml_coins,
          current_members_count as members_count,
          achievements_earned,
          modules_completed
         FROM social_features.teams
         WHERE is_active = true AND is_public = true
         ORDER BY total_xp DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        rank: row.rank,
        guildId: row.guild_id,
        guildName: row.guild_name,
        avatarUrl: row.avatar_url,
        totalXP: row.total_xp,
        totalMLCoins: row.total_ml_coins,
        membersCount: row.members_count,
        achievementsEarned: row.achievements_earned,
        modulesCompleted: row.modules_completed,
      }));
    } catch (error) {
      log.error('Error getting guild leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user's current guild
   */
  async getUserGuild(userId: string, dbClient?: PoolClient): Promise<Guild | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<Guild>(
        `SELECT t.*
         FROM social_features.teams t
         JOIN social_features.team_members tm ON t.id = tm.team_id
         WHERE tm.user_id = $1
           AND tm.status = 'active'
           AND t.is_active = true
         LIMIT 1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting user guild:', error);
      throw error;
    }
  }

  /**
   * Get all guilds (paginated, including private ones)
   */
  async getAllGuilds(limit: number = 50, offset: number = 0, filters?: { isPublic?: boolean }, dbClient?: PoolClient): Promise<{ guilds: Guild[]; total: number }> {
    try {
      const client = dbClient || this.pool;

      let whereClause = 'WHERE is_active = true';
      const queryParams: any[] = [];

      if (filters?.isPublic !== undefined) {
        queryParams.push(filters.isPublic);
        whereClause += ` AND is_public = $${queryParams.length}`;
      }

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM social_features.teams ${whereClause}`,
        queryParams
      );

      const total = parseInt(countResult.rows[0].total, 10);

      // Get paginated results
      queryParams.push(limit);
      queryParams.push(offset);

      const result = await client.query<Guild>(
        `SELECT * FROM social_features.teams
         ${whereClause}
         ORDER BY total_xp DESC, current_members_count DESC
         LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
        queryParams
      );

      return {
        guilds: result.rows,
        total,
      };
    } catch (error) {
      log.error('Error getting all guilds:', error);
      throw error;
    }
  }

  /**
   * Generate unique team code
   */
  private generateTeamCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
