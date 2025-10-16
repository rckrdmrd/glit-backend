/**
 * Powerups Controller - HTTP handlers for powerup endpoints
 */

import { Response, NextFunction } from 'express';
import { PowerupsService } from './powerups.service';
import { AuthRequest } from '../../shared/types';

export class PowerupsController {
  constructor(private powerupsService: PowerupsService) {}

  getInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const inventory = await this.powerupsService.getInventory(userId, req.dbClient);
      res.json({ success: true, data: inventory });
    } catch (error) {
      next(error);
    }
  };

  purchasePowerup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, powerupType, quantity } = req.body;
      const result = await this.powerupsService.purchasePowerup(userId, powerupType, quantity || 1, req.dbClient);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  usePowerup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, powerupType, exerciseId } = req.body;
      const result = await this.powerupsService.usePowerup(userId, powerupType, exerciseId, req.dbClient);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getAvailable = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const powerups = this.powerupsService.getAvailablePowerups();
      res.json({ success: true, data: powerups });
    } catch (error) {
      next(error);
    }
  };
}
