/**
 * Health Check Routes
 *
 * System health and status endpoints.
 */

import { Router, Request, Response } from 'express';
import { pool, getPoolStats } from '../../database/pool';

const router = Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    },
  });
});

/**
 * GET /api/health/db
 * Database connection health check
 */
router.get('/db', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    const duration = Date.now() - start;

    const poolStats = getPoolStats();

    res.json({
      success: true,
      data: {
        status: 'connected',
        responseTime: `${duration}ms`,
        serverTime: result.rows[0].current_time,
        version: result.rows[0].version.split(',')[0],
        pool: {
          total: poolStats.total,
          idle: poolStats.idle,
          waiting: poolStats.waiting,
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/health/detailed
 * Detailed system health check
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const healthData: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        total: process.memoryUsage().heapTotal,
        used: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external,
      },
    },
  };

  // Check database
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const duration = Date.now() - start;

    healthData.database = {
      status: 'connected',
      responseTime: `${duration}ms`,
      pool: getPoolStats(),
    };
  } catch (error) {
    healthData.status = 'degraded';
    healthData.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const statusCode = healthData.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: healthData.status === 'healthy',
    data: healthData,
  });
});

export default router;
