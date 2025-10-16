# Missions System - GLIT Platform

## Overview

Sistema completo de misiones (quests) para la plataforma GLIT. Incluye misiones diarias, semanales y especiales con objetivos, progreso automático y recompensas.

## Features

- **Auto-generation**: Misiones se crean automáticamente para usuarios activos
- **Auto-completion**: Misiones se marcan como completas cuando alcanzan 100% progreso
- **Three types**: Daily (3 missions), Weekly (5 missions), Special (events)
- **Cron jobs**: Reseteo automático y verificación de progreso
- **Templates**: Pool de 10+ templates por tipo de misión
- **Difficulty scaling**: Misiones más difíciles dan más recompensas
- **Expiration handling**: Misiones expiradas no se pueden reclamar

## Architecture

```
missions/
├── missions.types.ts        - TypeScript interfaces
├── missions.templates.ts    - Mission templates (30+ templates)
├── missions.repository.ts   - Database layer
├── missions.service.ts      - Business logic
├── missions.controller.ts   - HTTP handlers
├── missions.routes.ts       - Route definitions
├── missions.validation.ts   - Joi schemas
├── missions.cron.ts         - Cron jobs
├── missions.schema.sql      - Database schema
├── index.ts                 - Module exports
├── INTEGRATION.md           - Integration guide
└── README.md                - This file
```

## Endpoints

Total: **9 endpoints**

### 1. GET /api/gamification/missions/daily
Get user's 3 daily missions (auto-create if not exist)

**Response:**
```json
{
  "success": true,
  "data": {
    "missions": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "template_id": "daily_exercises_5",
        "title": "Completar 5 ejercicios",
        "description": "Completa 5 ejercicios de cualquier módulo hoy",
        "mission_type": "daily",
        "objectives": [
          {
            "type": "exercises_completed",
            "target": 5,
            "current": 2,
            "description": "Ejercicios completados"
          }
        ],
        "rewards": {
          "ml_coins": 50,
          "xp": 100
        },
        "status": "in_progress",
        "progress": 40,
        "start_date": "2025-10-16T00:00:00Z",
        "end_date": "2025-10-16T23:59:59Z",
        "created_at": "2025-10-16T00:00:00Z"
      }
    ],
    "count": 3,
    "type": "daily",
    "expiresAt": "2025-10-16T23:59:59Z"
  }
}
```

### 2. GET /api/gamification/missions/weekly
Get user's 5 weekly missions (auto-create if not exist)

### 3. GET /api/gamification/missions/special
Get user's active special missions (events)

### 4. POST /api/gamification/missions/:id/claim
Claim rewards from completed mission

**Request:**
```
POST /api/gamification/missions/abc123.../claim
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mission": { ... },
    "rewards": {
      "ml_coins": 50,
      "xp": 100,
      "items": ["power_up_hint"]
    },
    "message": "Rewards claimed successfully"
  }
}
```

### 5. GET /api/gamification/missions/:id/progress
Get progress details for specific mission

**Response:**
```json
{
  "success": true,
  "data": {
    "mission": { ... },
    "percentage": 60,
    "objectivesCompleted": 2,
    "totalObjectives": 3,
    "canClaim": false,
    "timeRemaining": 3600000
  }
}
```

### 6. POST /api/gamification/missions/:id/complete
Mark mission as complete (internal use)

### 7. GET /api/gamification/missions/user/:userId
Get all missions for user (with filters and pagination)

**Query params:**
- `status` - Filter by status (active, in_progress, completed, claimed, expired)
- `type` - Filter by type (daily, weekly, special)
- `page` - Page number
- `limit` - Results per page

### 8. POST /api/gamification/missions/check/:userId
Update mission progress based on user action

**Request:**
```json
{
  "actionType": "exercises_completed",
  "amount": 1,
  "metadata": {}
}
```

### 9. GET /api/gamification/missions/stats/:userId
Get user mission statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMissions": 25,
    "completedMissions": 18,
    "claimedMissions": 15,
    "expiredMissions": 3,
    "totalRewardsEarned": {
      "mlCoins": 1250,
      "xp": 2500
    },
    "completionRate": 60,
    "dailyStreak": 7,
    "weeklyStreak": 2
  }
}
```

## Mission Templates

### Daily Templates (10 templates)

1. **daily_exercises_5** - Completar 5 ejercicios (50 coins, 100 XP)
2. **daily_coins_100** - Ganar 100 ML Coins (75 coins, 150 XP)
3. **daily_module_complete** - Completar 1 módulo (150 coins, 300 XP)
4. **daily_powerups_3** - Usar 3 power-ups (60 coins, 120 XP + hint)
5. **daily_perfect_score** - Lograr 1 puntaje perfecto (100 coins, 200 XP)
6. **daily_no_hints** - Completar 3 ejercicios sin pistas (80 coins, 160 XP)
7. **daily_streak** - Mantener racha (30 coins, 50 XP)
8. **daily_xp_200** - Ganar 200 XP (70 coins, 140 XP)
9. **daily_exercises_10** - Completar 10 ejercicios (120 coins, 250 XP)
10. **daily_friends_help** - Ayudar a 2 compañeros (90 coins, 180 XP)

### Weekly Templates (10 templates)

1. **weekly_exercises_20** - Completar 20 ejercicios (300 coins, 600 XP)
2. **weekly_coins_500** - Ganar 500 ML Coins (400 coins, 800 XP)
3. **weekly_rank_up** - Subir de rango (500 coins, 1000 XP)
4. **weekly_achievements_3** - Desbloquear 3 logros (350 coins, 700 XP)
5. **weekly_modules_3** - Completar 3 módulos (450 coins, 900 XP)
6. **weekly_streak_7** - Racha de 7 días (600 coins, 1200 XP)
7. **weekly_perfect_5** - 5 puntajes perfectos (400 coins, 800 XP)
8. **weekly_exercises_50** - Completar 50 ejercicios (700 coins, 1400 XP)
9. **weekly_xp_1000** - Ganar 1000 XP (500 coins, 1000 XP)
10. **weekly_login_5** - Iniciar sesión 5 días (250 coins, 500 XP)

### Special Templates (5 templates)

1. **special_weekend_challenge** - Desafío de fin de semana (500 coins, 1000 XP + items)
2. **special_science_day** - Día de la Ciencia (400 coins, 800 XP)
3. **special_guild_competition** - Competencia entre guilds (800 coins, 1600 XP)
4. **special_new_year** - Misión de Año Nuevo (1000 coins, 2000 XP + items)
5. **special_maya_festival** - Festival Maya (700 coins, 1400 XP)

## Cron Jobs

### 1. Daily Missions Reset
**Schedule:** `0 0 * * *` (every day at 00:00 UTC)

**Tasks:**
- Expire old daily missions
- Generate 3 new daily missions for each active user

### 2. Weekly Missions Reset
**Schedule:** `0 0 * * 1` (every Monday at 00:00 UTC)

**Tasks:**
- Expire old weekly missions
- Generate 5 new weekly missions for each active user

### 3. Check Missions Progress
**Schedule:** `0 * * * *` (every hour)

**Tasks:**
- Check all active missions
- Auto-complete missions that reached 100% progress

### 4. Cleanup Expired Missions
**Schedule:** `0 3 * * *` (every day at 03:00 UTC)

**Tasks:**
- Delete expired missions older than 30 days

## Database Schema

```sql
CREATE TABLE gamification_system.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'special')),
  objectives JSONB NOT NULL,
  rewards JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'claimed', 'expired')),
  progress FLOAT NOT NULL DEFAULT 0,
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  claimed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

- `idx_missions_user_id` - User lookup
- `idx_missions_status` - Status filtering
- `idx_missions_type` - Type filtering
- `idx_missions_end_date` - Expiration queries
- `idx_missions_user_type_status` - Composite for active missions
- `idx_missions_template_id` - Template lookup

## Mission Status Flow

```
active → in_progress → completed → claimed
                    ↘ expired
```

- **active**: Mission created, no progress yet
- **in_progress**: User has made some progress
- **completed**: All objectives met (100% progress)
- **claimed**: User claimed rewards
- **expired**: Mission expired before completion

## Objective Types

```typescript
type ObjectiveType =
  | 'exercises_completed'
  | 'ml_coins_earned'
  | 'modules_completed'
  | 'powerups_used'
  | 'achievements_unlocked'
  | 'perfect_scores'
  | 'streak_maintained'
  | 'friends_helped'
  | 'login_days'
  | 'rank_up'
  | 'guild_joined'
  | 'exercises_no_hints'
  | 'weekly_exercises'
  | 'total_xp_earned';
```

## Integration Example

```typescript
// In your educational module
import { missionsService } from '../gamification/missions';

// When user completes an exercise
await missionsService.updateMissionProgress(
  userId,
  'exercises_completed',
  1
);

// When user earns coins
await missionsService.updateMissionProgress(
  userId,
  'ml_coins_earned',
  50
);

// When user completes a module
await missionsService.updateMissionProgress(
  userId,
  'modules_completed',
  1
);
```

See [INTEGRATION.md](./INTEGRATION.md) for detailed integration guide.

## Testing

### Manual Testing with cURL

```bash
# Get daily missions
curl -X GET http://localhost:3000/api/gamification/missions/daily \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update progress
curl -X POST http://localhost:3000/api/gamification/missions/check/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"actionType": "exercises_completed", "amount": 1}'

# Claim rewards
curl -X POST http://localhost:3000/api/gamification/missions/MISSION_ID/claim \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Logs

Cron job logs:

```
[CRON] Initializing missions cron jobs...
[CRON] ✓ Daily missions reset: 0 0 * * * (every day at 00:00 UTC)
[CRON] ✓ Weekly missions reset: 0 0 * * 1 (every Monday at 00:00 UTC)
[CRON] ✓ Check missions progress: 0 * * * * (every hour)
[CRON] ✓ Cleanup expired missions: 0 3 * * * (every day at 03:00 UTC)
[CRON] All missions cron jobs started successfully
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Mission not found"
  }
}
```

Error codes:
- `UNAUTHORIZED` - User not authenticated
- `NOT_FOUND` - Mission not found
- `VALIDATION_ERROR` - Invalid request data
- `INTERNAL_ERROR` - Server error

## Performance Considerations

- **Cron jobs** process users in batches to avoid database overload
- **Indexes** optimize queries for active missions
- **RLS policies** ensure users only see their own missions
- **Auto-cleanup** removes old expired missions to keep table size manageable

## Future Enhancements

- [ ] Mission recommendations based on user behavior
- [ ] Community missions (guild-based)
- [ ] Mission chains (complete X to unlock Y)
- [ ] Dynamic difficulty adjustment
- [ ] Mission analytics dashboard
- [ ] Push notifications for completed missions
- [ ] Mission leaderboards
- [ ] Custom mission creator for admins

## License

MIT
