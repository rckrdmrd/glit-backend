# Missions System - Quick Start Guide

Get the Missions system up and running in 5 minutes!

## Step 1: Create Database Table (1 minute)

Run this SQL as postgres user:

```bash
# Copy and paste this command
sudo -u postgres psql -d glit_platform << 'EOF'
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

CREATE INDEX IF NOT EXISTS idx_missions_user_id ON gamification_system.missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON gamification_system.missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_type ON gamification_system.missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_end_date ON gamification_system.missions(end_date);
CREATE INDEX IF NOT EXISTS idx_missions_user_type_status ON gamification_system.missions(user_id, mission_type, status);
CREATE INDEX IF NOT EXISTS idx_missions_template_id ON gamification_system.missions(template_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON gamification_system.missions TO glit_user;

CREATE OR REPLACE FUNCTION gamification_system.update_missions_updated_at()
RETURNS TRIGGER AS \$\$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS missions_updated_at ON gamification_system.missions;
CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON gamification_system.missions
  FOR EACH ROW
  EXECUTE FUNCTION gamification_system.update_missions_updated_at();

SELECT 'Missions table created successfully!' as status;
EOF
```

**Alternative:** If sudo doesn't work, create the SQL file and run it:
```bash
cat > /tmp/create_missions.sql << 'EOF'
[paste SQL above]
EOF

# Then run as postgres
su - postgres -c "psql -d glit_platform -f /tmp/create_missions.sql"
```

## Step 2: Verify Backend Integration (1 minute)

The missions module is already integrated! Verify by checking:

```bash
cd /home/isem/workspace/projects/glit/backend

# Check routes are mounted
grep "missions" src/modules/gamification/gamification.routes.ts

# Check cron jobs are initialized
grep "missions" src/server.ts

# Both should show results
```

Expected output:
```
✓ import missionsRoutes from './missions/missions.routes';
✓ router.use('/missions', missionsRoutes);
✓ startMissionsCronJobs();
✓ stopMissionsCronJobs();
```

## Step 3: Start Backend Server (1 minute)

```bash
cd /home/isem/workspace/projects/glit/backend

# Install dependencies (if not done)
npm install

# Start server
npm run dev
```

Look for this in the logs:
```
[CRON] Initializing missions cron jobs...
[CRON] ✓ Daily missions reset: 0 0 * * *
[CRON] ✓ Weekly missions reset: 0 0 * * 1
[CRON] ✓ Check missions progress: 0 * * * *
[CRON] ✓ Cleanup expired missions: 0 3 * * *
[CRON] All missions cron jobs started successfully
==================================================
Server running on: http://localhost:3001
==================================================
```

## Step 4: Test the API (2 minutes)

### Get Daily Missions

```bash
# Get your JWT token first
TOKEN="your_jwt_token_here"

# Get daily missions (will auto-create 3 missions)
curl -X GET http://localhost:3001/api/gamification/missions/daily \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

Expected response:
```json
{
  "success": true,
  "data": {
    "missions": [
      {
        "id": "abc-123-...",
        "title": "Completar 5 ejercicios",
        "mission_type": "daily",
        "status": "active",
        "progress": 0,
        "objectives": [
          {
            "type": "exercises_completed",
            "target": 5,
            "current": 0
          }
        ],
        "rewards": {
          "ml_coins": 50,
          "xp": 100
        },
        "end_date": "2025-10-16T23:59:59.999Z"
      }
      // ... 2 more missions
    ],
    "count": 3
  }
}
```

### Update Mission Progress

```bash
# Simulate completing an exercise
USER_ID="your_user_id_here"

curl -X POST http://localhost:3001/api/gamification/missions/check/$USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "exercises_completed",
    "amount": 1
  }' \
  | jq
```

### Check Mission Progress

```bash
# Get mission ID from previous response
MISSION_ID="mission_id_here"

curl -X GET http://localhost:3001/api/gamification/missions/$MISSION_ID/progress \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

Expected response:
```json
{
  "success": true,
  "data": {
    "mission": { ... },
    "percentage": 20,
    "objectivesCompleted": 0,
    "totalObjectives": 1,
    "canClaim": false,
    "timeRemaining": 82800000
  }
}
```

### Claim Rewards (after completing mission)

```bash
# First complete the mission (update progress to 100%)
# Then claim rewards

curl -X POST http://localhost:3001/api/gamification/missions/$MISSION_ID/claim \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

Expected response:
```json
{
  "success": true,
  "data": {
    "mission": { ... },
    "rewards": {
      "ml_coins": 50,
      "xp": 100
    },
    "message": "Rewards claimed successfully"
  }
}
```

## Step 5: Integrate with Your Module (Optional)

Add mission tracking to your services:

### Example: Track Exercise Completion

```typescript
// File: src/modules/educational/exercises.service.ts

import { onExerciseCompleted } from '../gamification/missions/missions.events';

export class ExercisesService {
  async completeExercise(userId: string, exerciseId: string, score: number) {
    // Your existing exercise completion logic
    // ...

    // Add mission tracking (won't fail if error occurs)
    await onExerciseCompleted(userId, {
      score,
      usedHints: false
    });

    return result;
  }
}
```

That's it! The missions system is now tracking exercise completions.

## Common Issues

### Issue: "Permission denied for schema gamification_system"

**Solution:**
```sql
GRANT USAGE ON SCHEMA gamification_system TO glit_user;
GRANT ALL ON ALL TABLES IN SCHEMA gamification_system TO glit_user;
```

### Issue: "Missions not auto-creating"

**Solution:** Make sure you have user_stats entries:
```sql
SELECT COUNT(*) FROM gamification_system.user_stats;
```

If empty, insert your user:
```sql
INSERT INTO gamification_system.user_stats (user_id, last_login_at)
VALUES ('your_user_id', NOW());
```

### Issue: "Cron jobs not running"

**Solution:** Check node-cron is installed:
```bash
npm list node-cron
# If not installed:
npm install node-cron
```

## What's Next?

1. **Read Full Documentation**
   - [README.md](./README.md) - Complete overview
   - [INTEGRATION.md](./INTEGRATION.md) - Integration guide
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment

2. **Integrate with More Modules**
   - Add to coins.service.ts
   - Add to gamification.service.ts
   - Add to ranks.service.ts
   - Add to powerups.service.ts

3. **Build Frontend UI**
   - Daily missions panel
   - Weekly missions panel
   - Progress bars
   - Claim rewards modal

4. **Monitor Performance**
   - Check cron job logs
   - Monitor database queries
   - Track completion rates

## Quick Reference

### All Endpoints

```
GET    /api/gamification/missions/daily
GET    /api/gamification/missions/weekly
GET    /api/gamification/missions/special
GET    /api/gamification/missions/user/:userId
GET    /api/gamification/missions/:id/progress
GET    /api/gamification/missions/stats/:userId
POST   /api/gamification/missions/:id/claim
POST   /api/gamification/missions/:id/complete
POST   /api/gamification/missions/check/:userId
```

### Event Helper Functions

```typescript
import {
  onExerciseCompleted,
  onMLCoinsEarned,
  onXPEarned,
  onModuleCompleted,
  onPowerupUsed,
  onAchievementUnlocked,
  onRankUp,
  onLogin,
  onStreakMaintained,
  onFriendHelped,
  onGuildJoined,
  updateProgress,
} from '../gamification/missions/missions.events';
```

### Objective Types

```
exercises_completed
ml_coins_earned
modules_completed
powerups_used
achievements_unlocked
perfect_scores
streak_maintained
friends_helped
login_days
rank_up
guild_joined
exercises_no_hints
weekly_exercises
total_xp_earned
```

## Support

Need help? Check:
- [README.md](./README.md) - Full documentation
- [INTEGRATION.md](./INTEGRATION.md) - Integration examples
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [IMPLEMENTATION_REPORT.md](./IMPLEMENTATION_REPORT.md) - Technical details

---

**Total Setup Time:** 5 minutes
**Status:** Ready to use!
