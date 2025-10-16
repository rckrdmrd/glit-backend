/**
 * Guilds Controller
 *
 * HTTP request handlers for guilds (teams) endpoints.
 */

import { Response, NextFunction } from 'express';
import { GuildsService } from './guilds.service';
import { CreateGuildDto, UpdateGuildDto, CreateGuildChallengeDto } from './guilds.types';
import { AuthRequest } from '../../../shared/types';

export class GuildsController {
  constructor(private guildsService: GuildsService) {}

  /**
   * Get all public guilds
   *
   * GET /api/social/guilds
   */
  getPublicGuilds = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.guildsService.getPublicGuilds(page, limit, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new guild
   *
   * POST /api/social/guilds
   */
  createGuild = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const dto: CreateGuildDto = req.body;
      const tenantId = req.user.tenant_id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      const guild = await this.guildsService.createGuild(req.user.id, dto, tenantId, req.dbClient);

      res.status(201).json({
        success: true,
        data: { guild },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get guild by ID
   *
   * GET /api/social/guilds/:id
   */
  getGuildById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const guild = await this.guildsService.getGuildById(id, req.dbClient);

      res.json({
        success: true,
        data: { guild },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update guild
   *
   * PUT /api/social/guilds/:id
   */
  updateGuild = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { id } = req.params;
      const dto: UpdateGuildDto = req.body;

      const guild = await this.guildsService.updateGuild(id, req.user.id, dto, req.dbClient);

      res.json({
        success: true,
        data: { guild },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete guild
   *
   * DELETE /api/social/guilds/:id
   */
  deleteGuild = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { id } = req.params;

      const result = await this.guildsService.deleteGuild(id, req.user.id, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Join guild
   *
   * POST /api/social/guilds/:id/join
   */
  joinGuild = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { id } = req.params;

      const result = await this.guildsService.joinGuild(id, req.user.id, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Leave guild
   *
   * POST /api/social/guilds/:id/leave
   */
  leaveGuild = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { id } = req.params;

      const result = await this.guildsService.leaveGuild(id, req.user.id, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get guild members
   *
   * GET /api/social/guilds/:id/members
   */
  getGuildMembers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const members = await this.guildsService.getGuildMembers(id, req.dbClient);

      res.json({
        success: true,
        data: {
          members,
          total: members.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove member from guild
   *
   * DELETE /api/social/guilds/:guildId/members/:memberId
   */
  removeMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { guildId, memberId } = req.params;

      const result = await this.guildsService.removeMember(guildId, req.user.id, memberId, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update member role
   *
   * PATCH /api/social/guilds/:guildId/members/:memberId/role
   */
  updateMemberRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { guildId, memberId } = req.params;
      const { role } = req.body;

      if (!role || (role !== 'admin' && role !== 'member')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Role must be either "admin" or "member"',
          },
        });
        return;
      }

      const result = await this.guildsService.updateMemberRole(guildId, req.user.id, memberId, role, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get guild challenges
   *
   * GET /api/social/guilds/:id/challenges
   */
  getGuildChallenges = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const challenges = await this.guildsService.getGuildChallenges(id, req.dbClient);

      res.json({
        success: true,
        data: {
          challenges,
          total: challenges.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create guild challenge
   *
   * POST /api/social/guilds/:id/challenges
   */
  createChallenge = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const { id } = req.params;
      const dto: CreateGuildChallengeDto = req.body;

      const challenge = await this.guildsService.createChallenge(id, req.user.id, dto, req.dbClient);

      res.status(201).json({
        success: true,
        data: { challenge },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get guild leaderboard
   *
   * GET /api/social/guilds/:id/leaderboard
   */
  getGuildLeaderboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      const leaderboard = await this.guildsService.getGuildLeaderboard(limit, req.dbClient);

      res.json({
        success: true,
        data: {
          leaderboard,
          total: leaderboard.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search guilds
   *
   * GET /api/social/guilds/search?q=name
   */
  searchGuilds = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query.q as string;

      if (!query) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query (q) is required',
          },
        });
        return;
      }

      const guilds = await this.guildsService.searchGuilds(query, req.dbClient);

      res.json({
        success: true,
        data: {
          guilds,
          total: guilds.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's current guild
   *
   * GET /api/social/guilds/user/:userId
   */
  getUserGuild = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const guild = await this.guildsService.getUserGuild(userId, req.dbClient);

      if (!guild) {
        res.json({
          success: true,
          data: {
            guild: null,
            message: 'User is not a member of any guild',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { guild },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all guilds (with pagination)
   *
   * GET /api/social/guilds/all
   */
  getAllGuilds = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const isPublic = req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined;

      const result = await this.guildsService.getAllGuilds(page, limit, isPublic, req.dbClient);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
