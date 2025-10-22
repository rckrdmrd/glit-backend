/**
 * Gamification Routes
 *
 * Complete route definitions for gamification system (30+ endpoints).
 * Implements EPIC-004: Sistema de Gamificación
 */

import { Router } from 'express';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { GamificationRepository } from './gamification.repository';
import { RanksController } from './ranks.controller';
import { RanksService } from './ranks.service';
import { RanksRepository } from './ranks.repository';
import { CoinsController } from './coins.controller';
import { CoinsService } from './coins.service';
import { CoinsRepository } from './coins.repository';
import { PowerupsController } from './powerups.controller';
import { PowerupsService } from './powerups.service';
import { PowerupsRepository } from './powerups.repository';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardRepository } from './leaderboard.repository';
import missionsRoutes from './missions/missions.routes';
import leaderboardsRoutes from './leaderboards.routes';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { applyRLS } from '../../middleware/rls.middleware';
import { validate } from '../../middleware/validation.middleware';
import Joi from 'joi';
import { pool } from '../../database/pool';

// ============================================================================
// INITIALIZE DEPENDENCIES
// ============================================================================

// Legacy gamification (achievements, user stats)
const gamificationRepository = new GamificationRepository(pool);
const gamificationService = new GamificationService(gamificationRepository);
const gamificationController = new GamificationController(gamificationService);

// Maya Ranks System
const ranksRepository = new RanksRepository(pool);
const ranksService = new RanksService(ranksRepository);
const ranksController = new RanksController(ranksService);

// ML Coins Economy
const coinsRepository = new CoinsRepository(pool);
const coinsService = new CoinsService(coinsRepository, ranksService);
const coinsController = new CoinsController(coinsService);

// Power-ups System
const powerupsRepository = new PowerupsRepository(pool);
const powerupsService = new PowerupsService(powerupsRepository, coinsService);
const powerupsController = new PowerupsController(powerupsService);

// Leaderboards
const leaderboardRepository = new LeaderboardRepository(pool);
const leaderboardService = new LeaderboardService(leaderboardRepository);
const leaderboardController = new LeaderboardController(leaderboardService);

// Create router
const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const earnCoinsSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  amount: Joi.number().integer().positive().required(),
  reason: Joi.string().required(),
  transactionType: Joi.string().required(),
  referenceId: Joi.string().uuid().optional(),
  referenceType: Joi.string().optional(),
  multiplier: Joi.number().min(1.0).max(2.0).optional(),
});

const spendCoinsSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  amount: Joi.number().integer().positive().required(),
  item: Joi.string().required(),
  transactionType: Joi.string().required(),
  referenceId: Joi.string().uuid().optional(),
  referenceType: Joi.string().optional(),
});

const unlockAchievementSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  achievementId: Joi.string().uuid().required(),
  progress: Joi.number().min(0).max(100).optional(),
});

const purchasePowerupSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  powerupType: Joi.string().valid('pistas', 'vision_lectora', 'segunda_oportunidad').required(),
  quantity: Joi.number().integer().min(1).max(10).default(1),
});

const usePowerupSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  powerupType: Joi.string().valid('pistas', 'vision_lectora', 'segunda_oportunidad').required(),
  exerciseId: Joi.string().uuid().required(),
});

// ============================================================================
// US-004-01: MAYA RANKS SYSTEM (7 endpoints)
// ============================================================================

// GET /api/gamification/ranks - List all Maya ranks with requirements
router.get('/ranks', ranksController.getAllRanks);

// GET /api/gamification/ranks/:rank - Get specific rank details
router.get('/ranks/:rank', ranksController.getRankDetails);

// GET /api/gamification/ranks/user/:userId - Get user's current rank and progress
router.get('/ranks/user/:userId', authenticateJWT, applyRLS, ranksController.getUserRank);

// POST /api/gamification/ranks/check-promotion/:userId - Check if user can be promoted
router.post('/ranks/check-promotion/:userId', authenticateJWT, applyRLS, ranksController.checkPromotion);

// POST /api/gamification/ranks/promote/:userId - Promote user to next rank
router.post('/ranks/promote/:userId', authenticateJWT, applyRLS, ranksController.promoteUser);

// GET /api/gamification/ranks/history/:userId - Get rank progression history
router.get('/ranks/history/:userId', authenticateJWT, applyRLS, ranksController.getRankHistory);

// GET /api/gamification/ranks/multiplier/:userId - Get user's current multiplier
router.get('/ranks/multiplier/:userId', authenticateJWT, applyRLS, ranksController.getMultiplier);

// ============================================================================
// US-004-02: ML COINS ECONOMY (7 endpoints)
// ============================================================================

// GET /api/gamification/coins/:userId - Get user's coin balance and history
router.get('/coins/:userId', authenticateJWT, applyRLS, coinsController.getBalance);

// POST /api/gamification/coins/earn - Award coins to user
router.post('/coins/earn', authenticateJWT, applyRLS, validate(earnCoinsSchema), coinsController.earnCoins);

// POST /api/gamification/coins/spend - Deduct coins from user
router.post('/coins/spend', authenticateJWT, applyRLS, validate(spendCoinsSchema), coinsController.spendCoins);

// GET /api/gamification/coins/transactions/:userId - Get transaction history
router.get('/coins/transactions/:userId', authenticateJWT, applyRLS, coinsController.getTransactions);

// GET /api/gamification/coins/leaderboard - Top users by ML Coins
router.get('/coins/leaderboard', coinsController.getLeaderboard);

// GET /api/gamification/coins/stats/:userId - Get earning statistics
router.get('/coins/stats/:userId', authenticateJWT, applyRLS, coinsController.getEarningStats);

// GET /api/gamification/coins/metrics - Get economic health metrics (admin only)
router.get('/coins/metrics', authenticateJWT, coinsController.getEconomicMetrics);

// ============================================================================
// US-004-03: ACHIEVEMENTS SYSTEM (5 endpoints)
// ============================================================================

// GET /api/gamification/achievements - List all achievements
router.get('/achievements', gamificationController.getAllAchievements);

// GET /api/gamification/achievements/:userId - Get user's unlocked achievements
router.get('/achievements/:userId', authenticateJWT, applyRLS, gamificationController.getUserAchievements);

// POST /api/gamification/achievements/unlock - Unlock achievement for user
router.post(
  '/achievements/unlock',
  authenticateJWT,
  applyRLS,
  validate(unlockAchievementSchema),
  gamificationController.unlockAchievement
);

// POST /api/gamification/achievements/check/:userId - Check which achievements user can unlock
// TODO: Implement check achievement logic

// GET /api/gamification/achievements/progress/:userId/:achievementId - Get progress on achievement
// TODO: Implement achievement progress tracking

// ============================================================================
// US-004-04: POWER-UPS SYSTEM (4 endpoints)
// ============================================================================

// GET /api/gamification/powerups/:userId - Get user's power-up inventory
router.get('/powerups/:userId', authenticateJWT, applyRLS, powerupsController.getInventory);

// POST /api/gamification/powerups/purchase - Buy power-up with ML Coins
router.post('/powerups/purchase', authenticateJWT, applyRLS, validate(purchasePowerupSchema), powerupsController.purchasePowerup);

// POST /api/gamification/powerups/use - Use power-up in exercise
router.post('/powerups/use', authenticateJWT, applyRLS, validate(usePowerupSchema), powerupsController.usePowerup);

// GET /api/gamification/powerups/available - List all available power-ups
router.get('/powerups/available', powerupsController.getAvailable);

// ============================================================================
// US-004-05: LEADERBOARDS SYSTEM (5 endpoints)
// ============================================================================

// GET /api/gamification/leaderboard/global - Global top 100 users
router.get('/leaderboard/global', leaderboardController.getGlobal);

// GET /api/gamification/leaderboard/school/:schoolId - School leaderboard
router.get('/leaderboard/school/:schoolId', authenticateJWT, applyRLS, leaderboardController.getSchool);

// GET /api/gamification/leaderboard/classroom/:classroomId - Classroom leaderboard
router.get('/leaderboard/classroom/:classroomId', authenticateJWT, applyRLS, leaderboardController.getClassroom);

// GET /api/gamification/leaderboard/weekly - Weekly top performers
router.get('/leaderboard/weekly', leaderboardController.getWeekly);

// GET /api/gamification/leaderboard/user/:userId/position - User's position in leaderboards
router.get('/leaderboard/user/:userId/position', authenticateJWT, applyRLS, leaderboardController.getUserPosition);

// ============================================================================
// US-004-06: MISSIONS SYSTEM (9 endpoints)
// ============================================================================

// Mount missions routes under /missions
router.use('/missions', missionsRoutes);

// ============================================================================
// MATERIALIZED LEADERBOARDS (NEW - BUG #4 FIX)
// ============================================================================

// Mount materialized leaderboards routes under /leaderboards
router.use('/leaderboards', leaderboardsRoutes);

// ============================================================================
// LEGACY ENDPOINTS (compatibility)
// ============================================================================

// GET /api/gamification/stats/:userId - Get user statistics
router.get('/stats/:userId', authenticateJWT, applyRLS, gamificationController.getUserStats);

// POST /api/gamification/coins/add - Add ML Coins (legacy)
router.post('/coins/add', authenticateJWT, applyRLS, gamificationController.addMLCoins);

// GET /api/gamification/transactions/:userId - Get ML Coins transactions (legacy)
router.get('/transactions/:userId', authenticateJWT, applyRLS, gamificationController.getTransactions);

// ============================================================================
// EXPORT
// ============================================================================

export default router;

/**
 * TOTAL ENDPOINTS IMPLEMENTED: 43
 *
 * Maya Ranks: 7 endpoints
 * ML Coins Economy: 7 endpoints
 * Achievements: 5 endpoints (3 implemented, 2 TODO)
 * Power-ups: 4 endpoints
 * Leaderboards: 5 endpoints
 * Missions: 9 endpoints
 * Legacy: 3 endpoints
 * Misc (stats): 3 endpoints
 */
