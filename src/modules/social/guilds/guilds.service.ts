/**
 * Guilds Service
 *
 * Business logic for guild (teams) operations.
 */

import { PoolClient } from 'pg';
import { GuildsRepository } from './guilds.repository';
import { Guild, CreateGuildDto, UpdateGuildDto, CreateGuildChallengeDto, GuildMemberProfile, GuildChallenge, GuildLeaderboardEntry } from './guilds.types';
import { AppError } from '../../../middleware/error.middleware';
import { ErrorCode } from '../../../shared/types';
import { log } from '../../../shared/utils/logger';

export class GuildsService {
  constructor(private guildsRepository: GuildsRepository) {}

  /**
   * Initialize guilds system
   */
  async initialize(dbClient?: PoolClient): Promise<void> {
    await this.guildsRepository.ensureTeamMembersTable(dbClient);
  }

  /**
   * Get all public guilds
   */
  async getPublicGuilds(page: number = 1, limit: number = 50, dbClient?: PoolClient): Promise<{ guilds: Guild[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      const guilds = await this.guildsRepository.getPublicGuilds(limit, offset, dbClient);

      return {
        guilds,
        total: guilds.length,
      };
    } catch (error) {
      log.error('Error getting public guilds:', error);
      throw new AppError('Failed to get guilds', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Create new guild
   */
  async createGuild(userId: string, dto: CreateGuildDto, tenantId: string, dbClient?: PoolClient): Promise<Guild> {
    try {
      // Validate input
      if (!dto.name || dto.name.trim().length < 3) {
        throw new AppError('Guild name must be at least 3 characters', 400, ErrorCode.VALIDATION_ERROR);
      }

      if (dto.name.length > 50) {
        throw new AppError('Guild name must not exceed 50 characters', 400, ErrorCode.VALIDATION_ERROR);
      }

      if (dto.maxMembers && (dto.maxMembers < 2 || dto.maxMembers > 100)) {
        throw new AppError('Max members must be between 2 and 100', 400, ErrorCode.VALIDATION_ERROR);
      }

      return await this.guildsRepository.createGuild(userId, dto, tenantId, dbClient);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error creating guild:', error);
      throw new AppError('Failed to create guild', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get guild by ID
   */
  async getGuildById(guildId: string, dbClient?: PoolClient): Promise<Guild> {
    try {
      const guild = await this.guildsRepository.getGuildById(guildId, dbClient);

      if (!guild) {
        throw new AppError('Guild not found', 404, ErrorCode.NOT_FOUND);
      }

      return guild;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error getting guild:', error);
      throw new AppError('Failed to get guild', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Update guild
   */
  async updateGuild(guildId: string, userId: string, dto: UpdateGuildDto, dbClient?: PoolClient): Promise<Guild> {
    try {
      // Check if user is owner
      const membership = await this.guildsRepository.checkMembership(guildId, userId, dbClient);

      if (!membership || membership.role !== 'owner') {
        throw new AppError('Only guild owner can update guild settings', 403, ErrorCode.FORBIDDEN);
      }

      // Validate input
      if (dto.name && (dto.name.trim().length < 3 || dto.name.length > 50)) {
        throw new AppError('Guild name must be between 3 and 50 characters', 400, ErrorCode.VALIDATION_ERROR);
      }

      if (dto.maxMembers && (dto.maxMembers < 2 || dto.maxMembers > 100)) {
        throw new AppError('Max members must be between 2 and 100', 400, ErrorCode.VALIDATION_ERROR);
      }

      return await this.guildsRepository.updateGuild(guildId, dto, dbClient);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error updating guild:', error);
      throw new AppError('Failed to update guild', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Delete guild
   */
  async deleteGuild(guildId: string, userId: string, dbClient?: PoolClient): Promise<{ message: string }> {
    try {
      // Check if user is owner
      const membership = await this.guildsRepository.checkMembership(guildId, userId, dbClient);

      if (!membership || membership.role !== 'owner') {
        throw new AppError('Only guild owner can delete guild', 403, ErrorCode.FORBIDDEN);
      }

      await this.guildsRepository.deleteGuild(guildId, dbClient);

      return {
        message: 'Guild deleted successfully',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error deleting guild:', error);
      throw new AppError('Failed to delete guild', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Join guild
   */
  async joinGuild(guildId: string, userId: string, dbClient?: PoolClient): Promise<{ message: string }> {
    try {
      // Check if guild exists
      const guild = await this.guildsRepository.getGuildById(guildId, dbClient);

      if (!guild) {
        throw new AppError('Guild not found', 404, ErrorCode.NOT_FOUND);
      }

      // Check if guild is at capacity
      if (guild.current_members_count >= guild.max_members) {
        throw new AppError('Guild is at maximum capacity', 400, 'GUILD_FULL');
      }

      // Check if user is already a member
      const existing = await this.guildsRepository.checkMembership(guildId, userId, dbClient);

      if (existing) {
        throw new AppError('Already a member of this guild', 409, ErrorCode.ALREADY_EXISTS);
      }

      // Add member
      await this.guildsRepository.addMember(guildId, userId, 'member', dbClient);

      return {
        message: 'Successfully joined guild',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error joining guild:', error);
      throw new AppError('Failed to join guild', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Leave guild
   */
  async leaveGuild(guildId: string, userId: string, dbClient?: PoolClient): Promise<{ message: string }> {
    try {
      // Check if user is member
      const membership = await this.guildsRepository.checkMembership(guildId, userId, dbClient);

      if (!membership) {
        throw new AppError('Not a member of this guild', 404, ErrorCode.NOT_FOUND);
      }

      // Prevent owner from leaving (must transfer ownership first)
      if (membership.role === 'owner') {
        throw new AppError('Guild owner must transfer ownership before leaving', 400, 'OWNER_CANNOT_LEAVE');
      }

      await this.guildsRepository.removeMember(guildId, userId, dbClient);

      return {
        message: 'Successfully left guild',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error leaving guild:', error);
      throw new AppError('Failed to leave guild', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get guild members
   */
  async getGuildMembers(guildId: string, dbClient?: PoolClient): Promise<GuildMemberProfile[]> {
    try {
      // Check if guild exists
      const guild = await this.guildsRepository.getGuildById(guildId, dbClient);

      if (!guild) {
        throw new AppError('Guild not found', 404, ErrorCode.NOT_FOUND);
      }

      return await this.guildsRepository.getGuildMembers(guildId, dbClient);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error getting guild members:', error);
      throw new AppError('Failed to get guild members', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Remove member from guild
   */
  async removeMember(guildId: string, currentUserId: string, targetUserId: string, dbClient?: PoolClient): Promise<{ message: string }> {
    try {
      // Check if current user has permission (owner or admin)
      const currentMembership = await this.guildsRepository.checkMembership(guildId, currentUserId, dbClient);

      if (!currentMembership || (currentMembership.role !== 'owner' && currentMembership.role !== 'admin')) {
        throw new AppError('Only guild owner or admin can remove members', 403, ErrorCode.FORBIDDEN);
      }

      // Check if target is owner (cannot be removed)
      const targetMembership = await this.guildsRepository.checkMembership(guildId, targetUserId, dbClient);

      if (!targetMembership) {
        throw new AppError('User is not a member of this guild', 404, ErrorCode.NOT_FOUND);
      }

      if (targetMembership.role === 'owner') {
        throw new AppError('Cannot remove guild owner', 400, 'CANNOT_REMOVE_OWNER');
      }

      // Admins cannot remove other admins
      if (currentMembership.role === 'admin' && targetMembership.role === 'admin') {
        throw new AppError('Admins cannot remove other admins', 403, ErrorCode.FORBIDDEN);
      }

      await this.guildsRepository.removeMember(guildId, targetUserId, dbClient);

      return {
        message: 'Member removed successfully',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error removing member:', error);
      throw new AppError('Failed to remove member', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(guildId: string, ownerId: string, targetUserId: string, newRole: 'admin' | 'member', dbClient?: PoolClient): Promise<{ message: string }> {
    try {
      // Only owner can change roles
      const ownerMembership = await this.guildsRepository.checkMembership(guildId, ownerId, dbClient);

      if (!ownerMembership || ownerMembership.role !== 'owner') {
        throw new AppError('Only guild owner can change member roles', 403, ErrorCode.FORBIDDEN);
      }

      // Check if target user is member
      const targetMembership = await this.guildsRepository.checkMembership(guildId, targetUserId, dbClient);

      if (!targetMembership) {
        throw new AppError('User is not a member of this guild', 404, ErrorCode.NOT_FOUND);
      }

      if (targetMembership.role === 'owner') {
        throw new AppError('Cannot change owner role', 400, 'CANNOT_CHANGE_OWNER_ROLE');
      }

      await this.guildsRepository.updateMemberRole(guildId, targetUserId, newRole, dbClient);

      return {
        message: `Member role updated to ${newRole}`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error updating member role:', error);
      throw new AppError('Failed to update member role', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get guild challenges
   */
  async getGuildChallenges(guildId: string, dbClient?: PoolClient): Promise<GuildChallenge[]> {
    try {
      // Check if guild exists
      const guild = await this.guildsRepository.getGuildById(guildId, dbClient);

      if (!guild) {
        throw new AppError('Guild not found', 404, ErrorCode.NOT_FOUND);
      }

      return await this.guildsRepository.getGuildChallenges(guildId, dbClient);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error getting guild challenges:', error);
      throw new AppError('Failed to get guild challenges', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Create guild challenge
   */
  async createChallenge(guildId: string, userId: string, dto: CreateGuildChallengeDto, dbClient?: PoolClient): Promise<GuildChallenge> {
    try {
      // Check if user is owner or admin
      const membership = await this.guildsRepository.checkMembership(guildId, userId, dbClient);

      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        throw new AppError('Only guild owner or admin can create challenges', 403, ErrorCode.FORBIDDEN);
      }

      // Validate dates
      const now = new Date();
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);

      if (endDate <= startDate) {
        throw new AppError('End date must be after start date', 400, ErrorCode.VALIDATION_ERROR);
      }

      if (endDate <= now) {
        throw new AppError('End date must be in the future', 400, ErrorCode.VALIDATION_ERROR);
      }

      return await this.guildsRepository.createChallenge(guildId, userId, dto, dbClient);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error creating guild challenge:', error);
      throw new AppError('Failed to create guild challenge', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get guild leaderboard
   */
  async getGuildLeaderboard(limit: number = 50, dbClient?: PoolClient): Promise<GuildLeaderboardEntry[]> {
    try {
      return await this.guildsRepository.getGuildLeaderboard(limit, dbClient);
    } catch (error) {
      log.error('Error getting guild leaderboard:', error);
      throw new AppError('Failed to get guild leaderboard', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Search guilds
   */
  async searchGuilds(query: string, dbClient?: PoolClient): Promise<Guild[]> {
    try {
      if (!query || query.trim().length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400, ErrorCode.VALIDATION_ERROR);
      }

      return await this.guildsRepository.searchGuilds(query.trim(), 20, dbClient);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error searching guilds:', error);
      throw new AppError('Failed to search guilds', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get user's current guild
   */
  async getUserGuild(userId: string, dbClient?: PoolClient): Promise<Guild | null> {
    try {
      return await this.guildsRepository.getUserGuild(userId, dbClient);
    } catch (error) {
      log.error('Error getting user guild:', error);
      throw new AppError('Failed to get user guild', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Get all guilds with pagination
   */
  async getAllGuilds(page: number = 1, limit: number = 50, isPublic?: boolean, dbClient?: PoolClient): Promise<{ guilds: Guild[]; total: number; page: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      const filters = isPublic !== undefined ? { isPublic } : undefined;
      const result = await this.guildsRepository.getAllGuilds(limit, offset, filters, dbClient);

      return {
        guilds: result.guilds,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit),
      };
    } catch (error) {
      log.error('Error getting all guilds:', error);
      throw new AppError('Failed to get guilds', 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
