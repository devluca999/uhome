-- Create admin_audit_logs table for tracking all admin actions
-- Run this in Supabase SQL Editor
-- IMPORTANT: This table stores audit trail for all admin actions (ban, lock, reset password, etc.)
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- STEP 1: CREATE ADMIN_AUDIT_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Admin performing the action
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  admin_email TEXT, -- Cached for historical reference (admins can be deleted)
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'ban', 
    'unban', 
    'lock', 
    'unlock', 
    'suspend', 
    'unsuspend',
    'reset_password', 
    'force_logout',
    'change_role',
    'update_user',
    'delete_user'
  )),
  
  -- Target user
  target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_email TEXT, -- Cached for historical reference (users can be deleted)
  target_user_role TEXT CHECK (target_user_role IN ('tenant', 'landlord', 'admin')),
  
  -- Action metadata
  reason TEXT, -- Optional admin notes explaining the action
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (e.g., lock duration, old/new values)
  
  -- Security tracking
  ip_address TEXT, -- Hashed IP address for security
  user_agent TEXT, -- Browser/device info
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: ENABLE RLS
-- ============================================================================

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on admin_id for filtering by admin
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);

-- Index on target_user_id for filtering by affected user
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON public.admin_audit_logs(target_user_id);

-- Index on action_type for filtering by action type
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON public.admin_audit_logs(action_type);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Composite index for common queries (admin + time)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_created ON public.admin_audit_logs(admin_id, created_at DESC);

-- Composite index for common queries (target user + time)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_created ON public.admin_audit_logs(target_user_id, created_at DESC);

-- Composite index for action type + time
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_created ON public.admin_audit_logs(action_type, created_at DESC);

-- Index on email for searching (cached emails)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_email ON public.admin_audit_logs(target_user_email) WHERE target_user_email IS NOT NULL;

-- ============================================================================
-- STEP 4: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.admin_audit_logs IS 'Audit trail for all admin actions. Stores complete history of admin actions including ban, lock, reset password, etc. All actions are logged before execution for accountability and compliance.';

COMMENT ON COLUMN public.admin_audit_logs.admin_id IS 'ID of the admin user performing the action. Can be NULL if admin is deleted (for historical records).';
COMMENT ON COLUMN public.admin_audit_logs.admin_email IS 'Cached email of the admin for historical reference. Preserved even if admin account is deleted.';
COMMENT ON COLUMN public.admin_audit_logs.action_type IS 'Type of action performed: ban, unban, lock, unlock, suspend, unsuspend, reset_password, force_logout, change_role, update_user, delete_user';
COMMENT ON COLUMN public.admin_audit_logs.target_user_id IS 'ID of the user affected by the action. Can be NULL if user is deleted (for historical records).';
COMMENT ON COLUMN public.admin_audit_logs.target_user_email IS 'Cached email of the target user for historical reference. Preserved even if user account is deleted.';
COMMENT ON COLUMN public.admin_audit_logs.reason IS 'Optional reason or notes provided by the admin explaining why the action was taken.';
COMMENT ON COLUMN public.admin_audit_logs.metadata IS 'Additional context about the action in JSON format. E.g., lock duration, old/new role values, etc.';
COMMENT ON COLUMN public.admin_audit_logs.ip_address IS 'Hashed IP address of the admin performing the action for security tracking.';
COMMENT ON COLUMN public.admin_audit_logs.user_agent IS 'Browser/device information of the admin performing the action.';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE 'Admin audit logs table created successfully.';
  RAISE NOTICE 'Remember to:';
  RAISE NOTICE '  1. Create RLS policies to restrict access to admin users only';
  RAISE NOTICE '  2. Log all admin actions to this table before execution';
  RAISE NOTICE '  3. Never delete audit logs (they are immutable for compliance)';
END $$;