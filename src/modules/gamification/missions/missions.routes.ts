/**
 * Missions Routes
 *
 * Route definitions for missions endpoints.
 */

import { Router } from 'express';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { MissionsRepository } from './missions.repository';
import { authenticateJWT } from '../../../middleware/auth.middleware';
import { applyRLS } from '../../../middleware/rls.middleware';
import { validate } from '../../../middleware/validation.middleware';
import {
  claimRewardsSchema,
  completeMissionSchema,
  getMissionProgressSchema,
  getUserMissionsSchema,
  checkMissionsProgressSchema,
  getUserMissionStatsSchema,
} from './missions.validation';
import { pool } from '../../../database/pool';

// Initialize dependencies
const missionsRepository = new MissionsRepository(pool);
const missionsService = new MissionsService(missionsRepository);
const missionsController = new MissionsController(missionsService);

// Create router
const router = Router();

// ============================================================================
// MISSIONS ENDPOINTS (8 total)
// ============================================================================

/**
 * GET /api/gamification/missions/daily
 * Get user's 3 daily missions (auto-create if not exist)
 */
router.get('/daily', authenticateJWT, applyRLS, missionsController.getDailyMissions);

/**
 * GET /api/gamification/missions/weekly
 * Get user's 5 weekly missions (auto-create if not exist)
 */
router.get('/weekly', authenticateJWT, applyRLS, missionsController.getWeeklyMissions);

/**
 * GET /api/gamification/missions/special
 * Get user's active special missions (events)
 */
router.get('/special', authenticateJWT, applyRLS, missionsController.getSpecialMissions);

/**
 * POST /api/gamification/missions/:id/claim
 * Claim rewards from completed mission
 */
router.post(
  '/:id/claim',
  authenticateJWT,
  applyRLS,
  validate(claimRewardsSchema),
  missionsController.claimRewards
);

/**
 * GET /api/gamification/missions/:id/progress
 * Get progress details for specific mission
 */
router.get(
  '/:id/progress',
  authenticateJWT,
  applyRLS,
  validate(getMissionProgressSchema),
  missionsController.getMissionProgress
);

/**
 * POST /api/gamification/missions/:id/complete
 * Mark mission as complete (internal use)
 */
router.post(
  '/:id/complete',
  authenticateJWT,
  applyRLS,
  validate(completeMissionSchema),
  missionsController.completeMission
);

/**
 * GET /api/gamification/missions/user/:userId
 * Get all missions for user (with filters and pagination)
 */
router.get(
  '/user/:userId',
  authenticateJWT,
  applyRLS,
  validate(getUserMissionsSchema),
  missionsController.getUserMissions
);

/**
 * POST /api/gamification/missions/check/:userId
 * Update mission progress based on user action
 */
router.post(
  '/check/:userId',
  authenticateJWT,
  applyRLS,
  validate(checkMissionsProgressSchema),
  missionsController.checkMissionsProgress
);

/**
 * GET /api/gamification/missions/stats/:userId
 * Get user mission statistics
 */
router.get(
  '/stats/:userId',
  authenticateJWT,
  applyRLS,
  validate(getUserMissionStatsSchema),
  missionsController.getUserMissionStats
);

// ============================================================================
// EXPORT
// ============================================================================

export default router;
export { missionsRepository, missionsService, missionsController };
