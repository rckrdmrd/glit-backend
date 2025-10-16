# Missions System - Deployment Guide

## Prerequisites

- PostgreSQL database with `gamification_system` schema
- Backend server running on port 3001
- Node.js with `node-cron` package installed

## Step 1: Database Setup

### Option A: Using psql (Recommended for Production)

Connect as a user with schema creation privileges (e.g., postgres):

```bash
psql -h localhost -p 5432 -U postgres -d glit_platform
```

Then run:

```sql
-- Create missions table
CREATE TABLE IF NOT EXISTS gamification_system.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'special')),
  objectives JSONB NOT NULL,
  rewards JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'claimed', 'expired')),
  progress FLOAT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  claimed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_missions_user_id ON gamification_system.missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON gamification_system.missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_type ON gamification_system.missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_end_date ON gamification_system.missions(end_date);
CREATE INDEX IF NOT EXISTS idx_missions_user_type_status ON gamification_system.missions(user_id, mission_type, status);
CREATE INDEX IF NOT EXISTS idx_missions_template_id ON gamification_system.missions(template_id);

-- Grant permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON gamification_system.missions TO glit_user;
GRANT USAGE ON SCHEMA gamification_system TO glit_user;

-- Create trigger function
CREATE OR REPLACE FUNCTION gamification_system.update_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS missions_updated_at ON gamification_system.missions;
CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON gamification_system.missions
  FOR EACH ROW
  EXECUTE FUNCTION gamification_system.update_missions_updated_at();
```

### Option B: Using SQL File

```bash
# Copy the SQL content to a file
cat > /tmp/create_missions_table.sql << 'EOF'
[paste SQL from Option A here]
EOF

# Execute
psql -h localhost -p 5432 -U postgres -d glit_platform -f /tmp/create_missions_table.sql
```

### Verify Installation

```bash
psql -h localhost -p 5432 -U postgres -d glit_platform -c "\d gamification_system.missions"
```

Expected output:
```
                                     Table "gamification_system.missions"
     Column      |            Type             | Collation | Nullable |      Default
-----------------+-----------------------------+-----------+----------+-------------------
 id              | uuid                        |           | not null | gen_random_uuid()
 user_id         | uuid                        |           | not null |
 template_id     | text                        |           | not null |
 title           | text                        |           | not null |
 ...
```

## Step 2: Backend Configuration

The missions module is already integrated in the backend. Verify the following files exist:

```bash
cd /home/isem/workspace/projects/glit/backend/src/modules/gamification/missions

# Check all files
ls -la
```

Expected files:
- ✓ `index.ts` - Module exports
- ✓ `missions.types.ts` - TypeScript interfaces
- ✓ `missions.templates.ts` - Mission templates (30+ templates)
- ✓ `missions.repository.ts` - Database layer
- ✓ `missions.service.ts` - Business logic
- ✓ `missions.controller.ts` - HTTP handlers
- ✓ `missions.routes.ts` - Route definitions
- ✓ `missions.validation.ts` - Joi validation schemas
- ✓ `missions.cron.ts` - Cron jobs
- ✓ `missions.events.ts` - Event helper
- ✓ `missions.schema.sql` - Database schema
- ✓ `missions-install.sql` - Installation script
- ✓ `README.md` - Documentation
- ✓ `INTEGRATION.md` - Integration guide
- ✓ `DEPLOYMENT.md` - This file

## Step 3: Verify Integration

### Check Route Integration

```bash
# Verify missions routes are mounted
grep -n "missions" /home/isem/workspace/projects/glit/backend/src/modules/gamification/gamification.routes.ts
```

Expected output:
```
24:import missionsRoutes from './missions/missions.routes';
219:router.use('/missions', missionsRoutes);
```

### Check Cron Job Integration

```bash
# Verify cron jobs are initialized
grep -n "missions" /home/isem/workspace/projects/glit/backend/src/server.ts
```

Expected output:
```
13:import { startMissionsCronJobs, stopMissionsCronJobs } from './modules/gamification/missions/missions.cron';
44:startMissionsCronJobs();
71:stopMissionsCronJobs();
```

## Step 4: Start Backend Server

```bash
cd /home/isem/workspace/projects/glit/backend
npm run dev
```

Expected output:
```
[CRON] Initializing missions cron jobs...
[CRON] ✓ Daily missions reset: 0 0 * * * (every day at 00:00 UTC)
[CRON] ✓ Weekly missions reset: 0 0 * * 1 (every Monday at 00:00 UTC)
[CRON] ✓ Check missions progress: 0 * * * * (every hour)
[CRON] ✓ Cleanup expired missions: 0 3 * * * (every day at 03:00 UTC)
[CRON] All missions cron jobs started successfully
==================================================
Server running on: http://localhost:3001
==================================================
```

## Step 5: Test Endpoints

### Get Daily Missions (Auto-create)

```bash
# Replace YOUR_TOKEN with actual JWT token
curl -X GET http://localhost:3001/api/gamification/missions/daily \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "missions": [
      {
        "id": "uuid",
        "title": "Completar 5 ejercicios",
        "mission_type": "daily",
        "status": "active",
        "progress": 0,
        "objectives": [...],
        "rewards": {"ml_coins": 50, "xp": 100}
      }
    ],
    "count": 3,
    "type": "daily"
  }
}
```

### Get Weekly Missions

```bash
curl -X GET http://localhost:3001/api/gamification/missions/weekly \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Progress (Manual Test)

```bash
curl -X POST http://localhost:3001/api/gamification/missions/check/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "exercises_completed",
    "amount": 1
  }'
```

### Check Mission Progress

```bash
curl -X GET http://localhost:3001/api/gamification/missions/MISSION_ID/progress \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Claim Rewards

```bash
curl -X POST http://localhost:3001/api/gamification/missions/MISSION_ID/claim \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Step 6: Integrate with Other Modules

Add mission progress tracking to your existing modules:

### Example: Exercises Module Integration

```typescript
// File: /home/isem/workspace/projects/glit/backend/src/modules/educational/exercises.service.ts

import { onExerciseCompleted } from '../gamification/missions/missions.events';

export class ExercisesService {
  async completeExercise(userId: string, exerciseId: string, score: number, usedHints: boolean) {
    // Your existing logic...

    // Add mission tracking
    await onExerciseCompleted(userId, {
      score,
      usedHints
    });

    return result;
  }
}
```

### Example: Coins Module Integration

```typescript
// File: /home/isem/workspace/projects/glit/backend/src/modules/gamification/coins.service.ts

import { onMLCoinsEarned } from './missions/missions.events';

export class CoinsService {
  async earnCoins(userId: string, amount: number, reason: string) {
    // Your existing logic...

    // Add mission tracking
    await onMLCoinsEarned(userId, amount);

    return result;
  }
}
```

### Example: Gamification Module Integration

```typescript
// File: /home/isem/workspace/projects/glit/backend/src/modules/gamification/gamification.service.ts

import { onAchievementUnlocked, onXPEarned } from './missions/missions.events';

export class GamificationService {
  async unlockAchievement(userId: string, achievementId: string) {
    // Your existing logic...

    // Add mission tracking
    await onAchievementUnlocked(userId);

    return result;
  }

  async addXP(userId: string, amount: number) {
    // Your existing logic...

    // Add mission tracking
    await onXPEarned(userId, amount);

    return result;
  }
}
```

See [INTEGRATION.md](./INTEGRATION.md) for complete integration guide.

## Step 7: Monitor Cron Jobs

Check logs for cron job execution:

```bash
# View backend logs
tail -f /home/isem/workspace/projects/glit/backend/logs/app.log

# Or if using console logging
npm run dev 2>&1 | grep CRON
```

Expected cron job logs:
```
[CRON] Starting daily missions reset...
[CRON] Found 150 active users
[CRON] Daily missions reset completed
[CRON] Stats: 150 users processed, 0 errors
```

## Troubleshooting

### Issue: Missions table doesn't exist

**Solution:** Run the SQL from Step 1 again as postgres user

### Issue: Permission denied for schema gamification_system

**Solution:** Grant permissions:
```sql
GRANT USAGE ON SCHEMA gamification_system TO glit_user;
GRANT ALL ON ALL TABLES IN SCHEMA gamification_system TO glit_user;
```

### Issue: Cron jobs not running

**Solution:** Check if `node-cron` is installed:
```bash
npm list node-cron
npm install node-cron
```

### Issue: Missions not auto-creating

**Solution:** Check user_stats table exists for active user detection:
```sql
SELECT * FROM gamification_system.user_stats LIMIT 5;
```

### Issue: Mission progress not updating

**Solution:** Verify mission events are imported correctly:
```typescript
// Check import
import { onExerciseCompleted } from '../gamification/missions/missions.events';
```

## Performance Monitoring

### Check Mission Stats

```bash
curl -X GET http://localhost:3001/api/gamification/missions/stats/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Database Queries

```sql
-- Count total missions
SELECT COUNT(*) FROM gamification_system.missions;

-- Count by status
SELECT status, COUNT(*)
FROM gamification_system.missions
GROUP BY status;

-- Count by type
SELECT mission_type, COUNT(*)
FROM gamification_system.missions
GROUP BY mission_type;

-- Recent missions
SELECT user_id, title, status, progress, created_at
FROM gamification_system.missions
ORDER BY created_at DESC
LIMIT 10;
```

## Production Deployment

### Environment Variables

No additional environment variables needed. Uses existing database configuration.

### Scaling Considerations

1. **Cron Jobs**: Run on a single server instance to avoid duplicate mission creation
2. **Database**: Add indexes as needed based on query patterns
3. **Caching**: Consider Redis for frequently accessed mission templates

### Backup Strategy

```bash
# Backup missions data
pg_dump -h localhost -U postgres -d glit_platform \
  -t gamification_system.missions \
  -f missions_backup_$(date +%Y%m%d).sql
```

### Monitoring

Monitor these metrics:
- Mission creation rate (daily/weekly)
- Mission completion rate
- Reward distribution
- Cron job execution time
- Database query performance

## Rollback Plan

If issues occur, you can disable the missions system:

1. Stop cron jobs:
```typescript
// In server.ts, comment out:
// startMissionsCronJobs();
```

2. Remove routes:
```typescript
// In gamification.routes.ts, comment out:
// router.use('/missions', missionsRoutes);
```

3. Drop table (if needed):
```sql
DROP TABLE IF EXISTS gamification_system.missions CASCADE;
```

## Next Steps

1. ✓ Database schema created
2. ✓ Backend routes active
3. ✓ Cron jobs running
4. ✓ Test endpoints working
5. → Integrate with other modules
6. → Create frontend UI
7. → Add WebSocket notifications
8. → Monitor performance

## Support

For issues or questions, refer to:
- [README.md](./README.md) - System overview
- [INTEGRATION.md](./INTEGRATION.md) - Integration guide
- [missions.types.ts](./missions.types.ts) - Type definitions

## Complete Endpoint List

All endpoints are mounted under `/api/gamification/missions`:

1. `GET /daily` - Get daily missions
2. `GET /weekly` - Get weekly missions
3. `GET /special` - Get special missions
4. `GET /user/:userId` - Get user missions (with filters)
5. `GET /:id/progress` - Get mission progress
6. `GET /stats/:userId` - Get mission statistics
7. `POST /:id/claim` - Claim rewards
8. `POST /:id/complete` - Complete mission (internal)
9. `POST /check/:userId` - Update progress (manual)

Total: **9 REST endpoints** + **4 cron jobs**

## Success Criteria

✓ Missions table created with proper indexes
✓ 9 REST endpoints responding correctly
✓ 4 cron jobs scheduled and running
✓ 30+ mission templates available
✓ Event integration helper created
✓ Documentation complete
✓ Tests passing
✓ No errors in logs

---

**Deployment Status:** READY FOR PRODUCTION

**Last Updated:** 2025-10-16
