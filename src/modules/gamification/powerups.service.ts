/**
 * Powerups Service - Business logic for power-ups
 */

import { PowerupsRepository, POWERUP_COSTS } from './powerups.repository';
import { CoinsService } from './coins.service';
import { AppError } from '../../middleware/error.middleware';
import { ErrorCode } from '../../shared/types';
import { log } from '../../shared/utils/logger';
import { PoolClient } from 'pg';

export class PowerupsService {
  constructor(private powerupsRepository: PowerupsRepository, private coinsService: CoinsService) {}

  async getInventory(userId: string, dbClient?: PoolClient): Promise<any> {
    try {
      let inventory = await this.powerupsRepository.getInventory(userId, dbClient);

      if (!inventory) {
        inventory = await this.powerupsRepository.initializeInventory(userId, dbClient);
      }

      return {
        pistas: {
          available: inventory.pistas_available,
          purchased: inventory.pistas_purchased_total,
          used: inventory.pistas_used_total,
          cost: inventory.pistas_cost,
        },
        visionLectora: {
          available: inventory.vision_lectora_available,
          purchased: inventory.vision_lectora_purchased_total,
          used: inventory.vision_lectora_used_total,
          cost: inventory.vision_lectora_cost,
        },
        segundaOportunidad: {
          available: inventory.segunda_oportunidad_available,
          purchased: inventory.segunda_oportunidad_purchased_total,
          used: inventory.segunda_oportunidad_used_total,
          cost: inventory.segunda_oportunidad_cost,
        },
      };
    } catch (error) {
      log.error('Error getting inventory:', error);
      throw new AppError('Failed to get inventory', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  async purchasePowerup(userId: string, powerupType: string, quantity: number, dbClient?: PoolClient): Promise<any> {
    try {
      const cost = POWERUP_COSTS[powerupType as keyof typeof POWERUP_COSTS];
      if (!cost) {
        throw new AppError('Invalid powerup type', 400, 'INVALID_POWERUP_TYPE');
      }

      const totalCost = cost * quantity;

      // Spend ML Coins
      await this.coinsService.spendCoins(
        {
          userId,
          amount: totalCost,
          item: `${powerupType} x${quantity}`,
          transactionType: 'spent_powerup',
          referenceType: 'powerup',
        },
        dbClient
      );

      // Add to inventory
      const inventory = await this.powerupsRepository.purchasePowerup(userId, powerupType, quantity, dbClient);

      return {
        message: `Purchased ${quantity} ${powerupType}`,
        totalCost,
        inventory: await this.getInventory(userId, dbClient),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      log.error('Error purchasing powerup:', error);
      throw new AppError('Failed to purchase powerup', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  async usePowerup(userId: string, powerupType: string, exerciseId: string, dbClient?: PoolClient): Promise<any> {
    try {
      const inventory = await this.powerupsRepository.usePowerup(userId, powerupType, exerciseId, dbClient);

      return {
        message: `Used ${powerupType}`,
        remainingPowerups: await this.getInventory(userId, dbClient),
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Powerup not available') {
        throw new AppError('Powerup not available', 400, 'POWERUP_NOT_AVAILABLE');
      }
      log.error('Error using powerup:', error);
      throw new AppError('Failed to use powerup', 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  getAvailablePowerups(): any[] {
    return this.powerupsRepository.getAvailablePowerups();
  }
}
