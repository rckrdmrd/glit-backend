-- =====================================================
-- Admin Module Database Migration
-- =====================================================
-- Description: Creates tables and indexes for admin functionality
-- Version: 009
-- Created: 2025-10-16
-- =====================================================

-- =====================================================
-- USER SUSPENSIONS TABLE
-- =====================================================

-- Create table for user suspensions
CREATE TABLE IF NOT EXISTS auth_management.user_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    suspension_until TIMESTAMP WITH TIME ZONE, -- NULL means permanent ban
    suspended_by UUID NOT NULL REFERENCES auth.users(id),
    suspended_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one suspension record per user
    UNIQUE(user_id)
);

-- Create indexes for user suspensions
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON auth_management.user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_suspended_by ON auth_management.user_suspensions(suspended_by);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_until ON auth_management.user_suspensions(suspension_until)
    WHERE suspension_until IS NOT NULL;

-- Add comments
COMMENT ON TABLE auth_management.user_suspensions IS 'User account suspensions and bans';
COMMENT ON COLUMN auth_management.user_suspensions.suspension_until IS 'NULL indicates permanent ban, otherwise temporary suspension until this date';

-- =====================================================
-- USER ACTIVITY LOG TABLE
-- =====================================================

-- Create table for user activity logging
CREATE TABLE IF NOT EXISTS audit_logging.user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user activity
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON audit_logging.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON audit_logging.user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON audit_logging.user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_metadata ON audit_logging.user_activity USING gin(metadata);

-- Add comments
COMMENT ON TABLE audit_logging.user_activity IS 'User activity log for admin monitoring';

-- =====================================================
-- FLAGGED CONTENT TABLE
-- =====================================================

-- Create table for flagged content moderation
CREATE TABLE IF NOT EXISTS content_management.flagged_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL, -- 'exercise', 'comment', 'profile', 'post', 'message'
    content_id UUID NOT NULL,
    content_preview TEXT,

    -- Reporter information
    reported_by UUID NOT NULL REFERENCES auth.users(id),
    reason VARCHAR(255) NOT NULL,
    description TEXT,

    -- Moderation status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),

    -- Review information
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for flagged content
CREATE INDEX IF NOT EXISTS idx_flagged_content_type ON content_management.flagged_content(content_type);
CREATE INDEX IF NOT EXISTS idx_flagged_content_id ON content_management.flagged_content(content_id);
CREATE INDEX IF NOT EXISTS idx_flagged_content_status ON content_management.flagged_content(status);
CREATE INDEX IF NOT EXISTS idx_flagged_content_priority ON content_management.flagged_content(priority);
CREATE INDEX IF NOT EXISTS idx_flagged_content_reported_by ON content_management.flagged_content(reported_by);
CREATE INDEX IF NOT EXISTS idx_flagged_content_reviewed_by ON content_management.flagged_content(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_flagged_content_created_at ON content_management.flagged_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_content_pending ON content_management.flagged_content(created_at DESC)
    WHERE status = 'pending';

-- Add comments
COMMENT ON TABLE content_management.flagged_content IS 'Content flagged for moderation review';
COMMENT ON COLUMN content_management.flagged_content.content_preview IS 'Short preview of the flagged content for quick review';

-- =====================================================
-- SYSTEM LOGS TABLE
-- =====================================================

-- Create table for system logs
CREATE TABLE IF NOT EXISTS audit_logging.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Context
    service VARCHAR(100),
    module VARCHAR(100),
    user_id UUID REFERENCES auth.users(id),

    -- Error details
    error_name VARCHAR(255),
    error_message TEXT,
    error_stack TEXT,

    -- Additional data
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for system logs
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON audit_logging.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON audit_logging.system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON audit_logging.system_logs(service);
CREATE INDEX IF NOT EXISTS idx_system_logs_module ON audit_logging.system_logs(module);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON audit_logging.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_metadata ON audit_logging.system_logs USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_system_logs_errors ON audit_logging.system_logs(timestamp DESC)
    WHERE level IN ('error', 'fatal');

-- Add comments
COMMENT ON TABLE audit_logging.system_logs IS 'System-wide application logs for admin monitoring';

-- =====================================================
-- ADMIN DASHBOARD VIEWS
-- =====================================================

-- Create view for user statistics summary
CREATE OR REPLACE VIEW admin_dashboard.user_stats_summary AS
SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_users,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as users_today,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as users_this_week,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as users_this_month,
    COUNT(*) FILTER (WHERE last_sign_in_at >= CURRENT_DATE) as active_users_today,
    COUNT(*) FILTER (WHERE last_sign_in_at >= CURRENT_DATE - INTERVAL '7 days') as active_users_week,
    COUNT(*) FILTER (WHERE role = 'student') as total_students,
    COUNT(*) FILTER (WHERE role = 'admin_teacher') as total_teachers,
    COUNT(*) FILTER (WHERE role = 'super_admin') as total_admins
FROM auth.users;

-- Create view for organization statistics
CREATE OR REPLACE VIEW admin_dashboard.organization_stats_summary AS
SELECT
    COUNT(*) as total_organizations,
    COUNT(*) FILTER (WHERE is_active = true) as active_organizations,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_organizations_month
FROM auth_management.tenants;

-- Create view for content moderation queue
CREATE OR REPLACE VIEW admin_dashboard.moderation_queue AS
SELECT
    fc.id,
    fc.content_type,
    fc.content_id,
    fc.content_preview,
    fc.reason,
    fc.priority,
    fc.status,
    fc.created_at,
    u.email as reporter_email,
    p.full_name as reporter_name
FROM content_management.flagged_content fc
LEFT JOIN auth.users u ON fc.reported_by = u.id
LEFT JOIN auth_management.profiles p ON fc.reported_by = p.user_id
WHERE fc.status = 'pending'
ORDER BY
    CASE fc.priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
    END,
    fc.created_at ASC;

-- Create view for recent admin actions
CREATE OR REPLACE VIEW admin_dashboard.recent_admin_actions AS
SELECT
    ale.id,
    ale.action,
    ale.resource_type,
    ale.resource_id,
    ale.description,
    ale.status,
    ale.created_at,
    u.email as admin_email,
    p.full_name as admin_name
FROM audit_logging.audit_log_events ale
LEFT JOIN auth.users u ON ale.actor_id = u.id
LEFT JOIN auth_management.profiles p ON ale.actor_id = p.user_id
WHERE ale.event_type = 'admin_action'
ORDER BY ale.created_at DESC
LIMIT 100;

-- Add comments on views
COMMENT ON VIEW admin_dashboard.user_stats_summary IS 'Aggregated user statistics for admin dashboard';
COMMENT ON VIEW admin_dashboard.organization_stats_summary IS 'Aggregated organization statistics for admin dashboard';
COMMENT ON VIEW admin_dashboard.moderation_queue IS 'Pending content moderation items prioritized for review';
COMMENT ON VIEW admin_dashboard.recent_admin_actions IS 'Recent admin actions from audit log';

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to user_suspensions
DROP TRIGGER IF EXISTS update_user_suspensions_updated_at ON auth_management.user_suspensions;
CREATE TRIGGER update_user_suspensions_updated_at
    BEFORE UPDATE ON auth_management.user_suspensions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to flagged_content
DROP TRIGGER IF EXISTS update_flagged_content_updated_at ON content_management.flagged_content;
CREATE TRIGGER update_flagged_content_updated_at
    BEFORE UPDATE ON content_management.flagged_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log user activity automatically
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log login activity
    IF (TG_OP = 'UPDATE' AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) THEN
        INSERT INTO audit_logging.user_activity (
            user_id,
            activity_type,
            description,
            created_at
        ) VALUES (
            NEW.id,
            'user_login',
            'User logged in',
            NEW.last_sign_in_at
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for automatic activity logging
DROP TRIGGER IF EXISTS log_user_login_activity ON auth.users;
CREATE TRIGGER log_user_login_activity
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users (read-only for their own data)
GRANT SELECT ON audit_logging.user_activity TO authenticated;

-- Grant full permissions to service role (backend)
GRANT ALL ON auth_management.user_suspensions TO service_role;
GRANT ALL ON audit_logging.user_activity TO service_role;
GRANT ALL ON content_management.flagged_content TO service_role;
GRANT ALL ON audit_logging.system_logs TO service_role;

-- Grant select on views to service role
GRANT SELECT ON admin_dashboard.user_stats_summary TO service_role;
GRANT SELECT ON admin_dashboard.organization_stats_summary TO service_role;
GRANT SELECT ON admin_dashboard.moderation_queue TO service_role;
GRANT SELECT ON admin_dashboard.recent_admin_actions TO service_role;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert sample flagged content priorities reference data
-- (This is just for documentation purposes)

-- =====================================================
-- CLEANUP AND MAINTENANCE
-- =====================================================

-- Function to clean old user activity logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_user_activity(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logging.user_activity
    WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old system logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_system_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logging.system_logs
    WHERE timestamp < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL
    AND level IN ('debug', 'info'); -- Keep errors and warnings longer

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Admin module migration completed successfully';
    RAISE NOTICE 'Created tables: user_suspensions, user_activity, flagged_content, system_logs';
    RAISE NOTICE 'Created views: user_stats_summary, organization_stats_summary, moderation_queue, recent_admin_actions';
    RAISE NOTICE 'Created functions: cleanup_old_user_activity, cleanup_old_system_logs';
END $$;
