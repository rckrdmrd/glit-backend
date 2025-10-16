/**
 * Row Level Security (RLS) Middleware
 *
 * Sets PostgreSQL session variables for Row Level Security policies.
 * Establishes database context for authenticated users.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../shared/types';
import { pool } from '../database/pool';
import { log } from '../shared/utils/logger';

/**
 * Apply RLS Context Middleware
 *
 * Gets a database client from pool and sets PostgreSQL session variables
 * that RLS policies use to enforce access control.
 *
 * Session variables set:
 * - request.jwt.claim.sub = user_id
 * - request.jwt.claim.email = user_email
 * - request.jwt.claim.role = user_role
 *
 * The database client is attached to the request and released after response.
 */
export const applyRLS = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip RLS if user is not authenticated
  if (!req.user) {
    return next();
  }

  let client;

  try {
    // Get client from pool
    client = await pool.connect();

    // Set PostgreSQL session variables for RLS
    await client.query(`
      SET LOCAL request.jwt.claim.sub = '${req.user.id}';
      SET LOCAL request.jwt.claim.email = '${req.user.email}';
      SET LOCAL request.jwt.claim.role = '${req.user.role}';
    `);

    log.debug(`RLS context set for user: ${req.user.email} (${req.user.role})`);

    // Attach client to request
    req.dbClient = client;

    // Track if client has been released to prevent double-release
    let clientReleased = false;

    const releaseClient = () => {
      if (client && !clientReleased) {
        client.release();
        clientReleased = true;
        log.debug('Database client released');
      }
    };

    // Release client after response finishes
    res.on('finish', releaseClient);

    // Release client on connection close (e.g., client disconnect)
    res.on('close', releaseClient);

    next();
  } catch (error) {
    // Release client on error
    if (client) {
      client.release();
    }

    log.error('RLS middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to establish database context',
      },
    });
  }
};

/**
 * Apply RLS for Specific Tenant
 *
 * Sets tenant_id in addition to user context.
 * Used for multi-tenant scenarios.
 */
export const applyRLSWithTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || !req.user.tenant_id) {
    return next();
  }

  let client;

  try {
    client = await pool.connect();

    // Set session variables including tenant_id
    await client.query(`
      SET LOCAL request.jwt.claim.sub = '${req.user.id}';
      SET LOCAL request.jwt.claim.email = '${req.user.email}';
      SET LOCAL request.jwt.claim.role = '${req.user.role}';
      SET LOCAL request.jwt.claim.tenant_id = '${req.user.tenant_id}';
    `);

    log.debug(
      `RLS context with tenant set for user: ${req.user.email} (tenant: ${req.user.tenant_id})`
    );

    req.dbClient = client;

    // Track if client has been released to prevent double-release
    let clientReleased = false;

    const releaseClient = () => {
      if (client && !clientReleased) {
        client.release();
        clientReleased = true;
        log.debug('Database client released (with tenant)');
      }
    };

    res.on('finish', releaseClient);
    res.on('close', releaseClient);

    next();
  } catch (error) {
    if (client) {
      client.release();
    }

    log.error('RLS with tenant middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to establish database context',
      },
    });
  }
};
