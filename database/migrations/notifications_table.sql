/**
 * Notifications Table Migration
 *
 * Creates the notifications table and related indexes for the
 * real-time notifications system.
 *
 * Run this migration before starting the server with notifications enabled.
 */

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT NULL,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read
  ON notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON notifications(user_id, created_at DESC);

-- Create GIN index for JSONB data field (for querying JSON content)
CREATE INDEX IF NOT EXISTS idx_notifications_data
  ON notifications USING GIN (data);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Add comment to table
COMMENT ON TABLE notifications IS 'Real-time notifications for users';
COMMENT ON COLUMN notifications.id IS 'Unique notification identifier';
COMMENT ON COLUMN notifications.user_id IS 'User who receives the notification';
COMMENT ON COLUMN notifications.type IS 'Notification type (achievement_unlocked, level_up, etc.)';
COMMENT ON COLUMN notifications.title IS 'Notification title (shown in UI)';
COMMENT ON COLUMN notifications.message IS 'Notification message content';
COMMENT ON COLUMN notifications.data IS 'Additional JSON data specific to notification type';
COMMENT ON COLUMN notifications.read IS 'Whether the notification has been read';
COMMENT ON COLUMN notifications.created_at IS 'When the notification was created';
COMMENT ON COLUMN notifications.updated_at IS 'When the notification was last updated';

-- Optional: Add Row Level Security (RLS) if not already enabled
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Optional: Create RLS policy (users can only see their own notifications)
-- CREATE POLICY notifications_user_policy ON notifications
--   FOR ALL
--   USING (user_id = current_setting('request.jwt.claim.sub', true)::uuid);

-- Grant permissions (adjust based on your database roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO glit_user;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Notifications table created successfully!';
  RAISE NOTICE 'Indexes created for: user_id, read, created_at, data (JSONB)';
  RAISE NOTICE 'Trigger created for auto-updating updated_at column';
END $$;
