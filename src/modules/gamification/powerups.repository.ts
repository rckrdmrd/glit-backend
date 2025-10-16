/**
 * Powerups Repository
 *
 * Database access layer for power-ups (comodines) operations.
 */

import { Pool, PoolClient } from 'pg';
import { log } from '../../shared/utils/logger';

export interface PowerupInventory {
  id: string;
  user_id: string;
  pistas_available: number;
  vision_lectora_available: number;
  segunda_oportunidad_available: number;
  pistas_purchased_total: number;
  vision_lectora_purchased_total: number;
  segunda_oportunidad_purchased_total: number;
  pistas_used_total: number;
  vision_lectora_used_total: number;
  segunda_oportunidad_used_total: number;
  pistas_cost: number;
  vision_lectora_cost: number;
  segunda_oportunidad_cost: number;
}

export const POWERUP_COSTS = {
  pistas: 15,
  vision_lectora: 25,
  segunda_oportunidad: 40,
};

export class PowerupsRepository {
  constructor(private pool: Pool) {}

  /**
   * Get user's powerup inventory
   */
  async getInventory(userId: string, dbClient?: PoolClient): Promise<PowerupInventory | null> {
    try {
      const client = dbClient || this.pool;

      const result = await client.query<PowerupInventory>(
        `SELECT * FROM gamification_system.comodines_inventory WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      log.error('Error getting powerup inventory:', error);
      throw error;
    }
  }

  /**
   * Initialize inventory for new user
   */
  async initializeInventory(userId: string, dbClient?: PoolClient): Promise<PowerupInventory> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      const result = await client.query<PowerupInventory>(
        `INSERT INTO gamification_system.comodines_inventory (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING *`,
        [userId]
      );

      return result.rows[0];
    } catch (error) {
      log.error('Error initializing inventory:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Purchase powerup
   */
  async purchasePowerup(
    userId: string,
    powerupType: string,
    quantity: number,
    dbClient?: PoolClient
  ): Promise<PowerupInventory> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      const fieldMap: Record<string, string> = {
        pistas: 'pistas_available',
        vision_lectora: 'vision_lectora_available',
        segunda_oportunidad: 'segunda_oportunidad_available',
      };

      const purchasedMap: Record<string, string> = {
        pistas: 'pistas_purchased_total',
        vision_lectora: 'vision_lectora_purchased_total',
        segunda_oportunidad: 'segunda_oportunidad_purchased_total',
      };

      const field = fieldMap[powerupType];
      const purchasedField = purchasedMap[powerupType];

      if (!field) {
        throw new Error('Invalid powerup type');
      }

      const result = await client.query<PowerupInventory>(
        `UPDATE gamification_system.comodines_inventory
         SET ${field} = ${field} + $1,
             ${purchasedField} = ${purchasedField} + $1,
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [quantity, userId]
      );

      await client.query('COMMIT');

      log.info(`User ${userId} purchased ${quantity} ${powerupType}`);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error purchasing powerup:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Use powerup
   */
  async usePowerup(userId: string, powerupType: string, exerciseId: string, dbClient?: PoolClient): Promise<PowerupInventory> {
    const client = dbClient || await this.pool.connect();
    const shouldRelease = !dbClient;

    try {
      await client.query('BEGIN');

      const fieldMap: Record<string, string> = {
        pistas: 'pistas_available',
        vision_lectora: 'vision_lectora_available',
        segunda_oportunidad: 'segunda_oportunidad_available',
      };

      const usedMap: Record<string, string> = {
        pistas: 'pistas_used_total',
        vision_lectora: 'vision_lectora_used_total',
        segunda_oportunidad: 'segunda_oportunidad_used_total',
      };

      const field = fieldMap[powerupType];
      const usedField = usedMap[powerupType];

      if (!field) {
        throw new Error('Invalid powerup type');
      }

      // Check availability
      const checkResult = await client.query(
        `SELECT ${field} FROM gamification_system.comodines_inventory WHERE user_id = $1`,
        [userId]
      );

      if (checkResult.rows[0]?.[field] <= 0) {
        throw new Error('Powerup not available');
      }

      const result = await client.query<PowerupInventory>(
        `UPDATE gamification_system.comodines_inventory
         SET ${field} = ${field} - 1,
             ${usedField} = ${usedField} + 1,
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId]
      );

      await client.query('COMMIT');

      log.info(`User ${userId} used ${powerupType} on exercise ${exerciseId}`);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Error using powerup:', error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Get all available powerups
   */
  getAvailablePowerups(): any[] {
    return [
      {
        type: 'pistas',
        name: 'Pistas Contextuales',
        description: 'Reveals contextual hints for current exercise',
        cost: POWERUP_COSTS.pistas,
        limit: 3,
        icon: '💡',
      },
      {
        type: 'vision_lectora',
        name: 'Visión Lectora',
        description: 'Highlights key information in text',
        cost: POWERUP_COSTS.vision_lectora,
        limit: 1,
        icon: '👁️',
      },
      {
        type: 'segunda_oportunidad',
        name: 'Segunda Oportunidad',
        description: 'Retry failed exercise without penalty',
        cost: POWERUP_COSTS.segunda_oportunidad,
        limit: 1,
        icon: '🔄',
      },
    ];
  }
}
