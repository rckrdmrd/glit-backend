/**
 * Missions System Database Schema
 *
 * Creates the missions table in gamification_system schema.
 */

-- ============================================================================
-- MISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS gamification_system.missions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mission metadata
  template_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'special')),

  -- Mission objectives and rewards (JSONB)
  objectives JSONB NOT NULL,
  rewards JSONB NOT NULL,

  -- Mission state
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'claimed', 'expired')),
  progress FLOAT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Timestamps
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  claimed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying missions by user
CREATE INDEX IF NOT EXISTS idx_missions_user_id
ON gamification_system.missions(user_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_missions_status
ON gamification_system.missions(status);

-- Index for filtering by mission type
CREATE INDEX IF NOT EXISTS idx_missions_type
ON gamification_system.missions(mission_type);

-- Index for filtering by end date (for expiration queries)
CREATE INDEX IF NOT EXISTS idx_missions_end_date
ON gamification_system.missions(end_date);

-- Composite index for active missions by type
CREATE INDEX IF NOT EXISTS idx_missions_user_type_status
ON gamification_system.missions(user_id, mission_type, status);

-- Index for template lookup
CREATE INDEX IF NOT EXISTS idx_missions_template_id
ON gamification_system.missions(template_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE gamification_system.missions IS 'User missions/quests with objectives and rewards';
COMMENT ON COLUMN gamification_system.missions.template_id IS 'Reference to mission template ID';
COMMENT ON COLUMN gamification_system.missions.objectives IS 'JSON array of objectives with type, target, and current progress';
COMMENT ON COLUMN gamification_system.missions.rewards IS 'JSON object with ml_coins, xp, and optional items';
COMMENT ON COLUMN gamification_system.missions.progress IS 'Overall completion percentage (0-100)';
COMMENT ON COLUMN gamification_system.missions.status IS 'Mission lifecycle status';

-- ============================================================================
-- SAMPLE OBJECTIVES STRUCTURE
-- ============================================================================

-- Example objectives JSONB structure:
-- [
--   {
--     "type": "exercises_completed",
--     "target": 5,
--     "current": 2,
--     "description": "Complete 5 exercises"
--   },
--   {
--     "type": "ml_coins_earned",
--     "target": 100,
--     "current": 50,
--     "description": "Earn 100 ML Coins"
--   }
-- ]

-- ============================================================================
-- SAMPLE REWARDS STRUCTURE
-- ============================================================================

-- Example rewards JSONB structure:
-- {
--   "ml_coins": 50,
--   "xp": 100,
--   "items": ["power_up_hint", "power_up_vision_lectora"]
-- }

-- ============================================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS on missions table
ALTER TABLE gamification_system.missions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own missions
CREATE POLICY missions_select_own ON gamification_system.missions
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: Users can update their own missions
CREATE POLICY missions_update_own ON gamification_system.missions
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: System can insert missions (for cron jobs)
CREATE POLICY missions_insert_system ON gamification_system.missions
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can delete old missions (for cleanup)
CREATE POLICY missions_delete_system ON gamification_system.missions
  FOR DELETE
  USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, UPDATE ON gamification_system.missions TO authenticated;
GRANT INSERT, DELETE ON gamification_system.missions TO service_role;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION gamification_system.update_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON gamification_system.missions
  FOR EACH ROW
  EXECUTE FUNCTION gamification_system.update_missions_updated_at();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert a sample daily mission (uncomment to use)
/*
INSERT INTO gamification_system.missions (
  user_id,
  template_id,
  title,
  description,
  mission_type,
  objectives,
  rewards,
  status,
  progress,
  end_date
)
VALUES (
  'YOUR_USER_ID_HERE',
  'daily_exercises_5',
  'Completar 5 ejercicios',
  'Completa 5 ejercicios de cualquier módulo hoy',
  'daily',
  '[{"type": "exercises_completed", "target": 5, "current": 0, "description": "Ejercicios completados"}]'::jsonb,
  '{"ml_coins": 50, "xp": 100}'::jsonb,
  'active',
  0,
  NOW() + INTERVAL '1 day'
);
*/
