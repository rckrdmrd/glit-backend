/**
 * Missions System Database Schema - Installation Script
 *
 * Creates the missions table in gamification_system schema.
 * Run this as postgres user or superuser.
 */

-- Switch to postgres user context for schema modifications
-- This should be run by a user with sufficient privileges

-- ============================================================================
-- MISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS gamification_system.missions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL,

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
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON gamification_system.missions TO glit_user;

-- Grant usage on sequences if needed
GRANT USAGE ON SCHEMA gamification_system TO glit_user;

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
DROP TRIGGER IF EXISTS missions_updated_at ON gamification_system.missions;
CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON gamification_system.missions
  FOR EACH ROW
  EXECUTE FUNCTION gamification_system.update_missions_updated_at();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Verify table was created successfully
SELECT 'Missions table created successfully!' as status;
SELECT COUNT(*) as mission_count FROM gamification_system.missions;
