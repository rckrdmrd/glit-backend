# Missions System - Integration Guide

## Overview

The Missions system provides daily, weekly, and special quests for users to complete and earn rewards.

## How to Integrate from Other Modules

### Example: Update Mission Progress from Educational Module

When a user completes an exercise in the educational module, you should update their mission progress:

```typescript
// In your educational module (e.g., exercises.service.ts)
import { missionsService } from '../gamification/missions';

export class ExercisesService {
  async completeExercise(userId: string, exerciseId: string, score: number) {
    // Your existing exercise completion logic
    // ...

    // Update mission progress for exercises_completed
    try {
      await missionsService.updateMissionProgress(
        userId,
        'exercises_completed',
        1 // Increment by 1
      );

      // If perfect score (100%), also update perfect_scores
      if (score === 100) {
        await missionsService.updateMissionProgress(
          userId,
          'perfect_scores',
          1
        );
      }
    } catch (error) {
      log.error('Error updating mission progress:', error);
      // Don't fail the exercise completion if mission update fails
    }

    return result;
  }
}
```

### Example: Update Mission Progress for ML Coins

When a user earns ML Coins:

```typescript
// In coins.service.ts or wherever coins are awarded
import { missionsService } from '../gamification/missions';

export class CoinsService {
  async earnCoins(userId: string, amount: number, reason: string) {
    // Award coins logic
    const newBalance = await this.repository.updateMLCoins(userId, amount, ...);

    // Update mission progress
    try {
      await missionsService.updateMissionProgress(
        userId,
        'ml_coins_earned',
        amount // Increment by earned amount
      );
    } catch (error) {
      log.error('Error updating mission progress:', error);
    }

    return newBalance;
  }
}
```

### Example: Update Mission Progress for Power-ups

When a user uses a power-up:

```typescript
// In powerups.service.ts
import { missionsService } from '../gamification/missions';

export class PowerupsService {
  async usePowerup(userId: string, powerupType: string, exerciseId: string) {
    // Use powerup logic
    await this.repository.usePowerup(userId, powerupType, exerciseId);

    // Update mission progress
    try {
      await missionsService.updateMissionProgress(
        userId,
        'powerups_used',
        1
      );
    } catch (error) {
      log.error('Error updating mission progress:', error);
    }

    return result;
  }
}
```

### Example: Update Mission Progress for Module Completion

When a user completes a module:

```typescript
// In modules.service.ts
import { missionsService } from '../gamification/missions';

export class ModulesService {
  async completeModule(userId: string, moduleId: string) {
    // Complete module logic
    await this.repository.markModuleComplete(userId, moduleId);

    // Update mission progress
    try {
      await missionsService.updateMissionProgress(
        userId,
        'modules_completed',
        1
      );
    } catch (error) {
      log.error('Error updating mission progress:', error);
    }

    return result;
  }
}
```

### Example: Update Mission Progress for Achievements

When a user unlocks an achievement:

```typescript
// In gamification.service.ts
import { missionsService } from './missions';

export class GamificationService {
  async unlockAchievement(userId: string, achievementId: string) {
    // Unlock achievement logic
    await this.repository.unlockAchievement(userId, achievementId);

    // Update mission progress
    try {
      await missionsService.updateMissionProgress(
        userId,
        'achievements_unlocked',
        1
      );
    } catch (error) {
      log.error('Error updating mission progress:', error);
    }

    return result;
  }
}
```

## Available Action Types

When calling `updateMissionProgress`, use these action types:

- `exercises_completed` - User completed an exercise
- `ml_coins_earned` - User earned ML Coins
- `modules_completed` - User completed a module
- `powerups_used` - User used a power-up
- `achievements_unlocked` - User unlocked an achievement
- `perfect_scores` - User got 100% on an exercise
- `streak_maintained` - User maintained login streak
- `friends_helped` - User helped a friend
- `login_days` - User logged in
- `rank_up` - User ranked up
- `guild_joined` - User joined a guild
- `exercises_no_hints` - User completed exercise without hints
- `weekly_exercises` - User completed exercises (weekly counter)
- `total_xp_earned` - User earned XP

## Client-Side Integration

### Get Daily Missions

```typescript
// Frontend: Get user's daily missions
const response = await fetch('/api/gamification/missions/daily', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
console.log(data.missions); // Array of 3 daily missions
```

### Get Mission Progress

```typescript
// Frontend: Check progress of a specific mission
const response = await fetch(`/api/gamification/missions/${missionId}/progress`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
console.log(data.percentage); // e.g., 60
console.log(data.canClaim); // true/false
```

### Claim Rewards

```typescript
// Frontend: Claim rewards when mission is completed
const response = await fetch(`/api/gamification/missions/${missionId}/claim`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const { data } = await response.json();
console.log(data.rewards); // { ml_coins: 50, xp: 100 }
```

## WebSocket Integration (Optional)

You can emit WebSocket events when missions are completed:

```typescript
// In missions.service.ts
import { emitToUser } from '../../../websocket/socket.server';

export class MissionsService {
  async updateMissionProgress(userId: string, actionType: ObjectiveType, amount: number) {
    const updatedMissions = await this.repository.updateMissionProgress(...);

    // Check if any mission was just completed
    for (const mission of updatedMissions) {
      if (mission.status === 'completed' && mission.progress === 100) {
        // Emit WebSocket event
        emitToUser(userId, 'mission:completed', {
          mission,
          message: `Mission completed: ${mission.title}`,
        });
      }
    }

    return updatedMissions;
  }
}
```

## Testing with cURL

### Get Daily Missions

```bash
curl -X GET http://localhost:3000/api/gamification/missions/daily \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Weekly Missions

```bash
curl -X GET http://localhost:3000/api/gamification/missions/weekly \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Mission Progress (Manual)

```bash
curl -X POST http://localhost:3000/api/gamification/missions/check/USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "exercises_completed",
    "amount": 1
  }'
```

### Claim Rewards

```bash
curl -X POST http://localhost:3000/api/gamification/missions/MISSION_ID/claim \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Mission Progress

```bash
curl -X GET http://localhost:3000/api/gamification/missions/MISSION_ID/progress \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get User Mission Stats

```bash
curl -X GET http://localhost:3000/api/gamification/missions/stats/USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Cron Jobs Schedule

The following cron jobs run automatically:

1. **Daily Missions Reset** - `0 0 * * *` (every day at 00:00 UTC)
   - Expires old daily missions
   - Creates new daily missions for active users

2. **Weekly Missions Reset** - `0 0 * * 1` (every Monday at 00:00 UTC)
   - Expires old weekly missions
   - Creates new weekly missions for active users

3. **Check Missions Progress** - `0 * * * *` (every hour)
   - Auto-completes missions that reached 100% progress

4. **Cleanup Expired Missions** - `0 3 * * *` (every day at 03:00 UTC)
   - Deletes expired missions older than 30 days

## Database Setup

Run the SQL schema to create the missions table:

```bash
psql -U postgres -d glit_db -f src/modules/gamification/missions/missions.schema.sql
```

Or execute the SQL directly in your database client.

## Environment Variables

No additional environment variables are required. The missions system uses the existing database connection pool.

## Troubleshooting

### Missions not auto-creating

Check logs for cron job execution:
```
[CRON] Starting daily missions reset...
[CRON] Found X active users
```

### Mission progress not updating

Ensure you're calling `updateMissionProgress` with the correct action type and user ID.

### Rewards not being awarded

Make sure the mission status is 'completed' before claiming. Use the `/progress` endpoint to check status.
