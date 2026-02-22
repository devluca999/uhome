-- Create RLS policies for admin_audit_logs table
-- Run this in Supabase SQL Editor
-- IMPORTANT: Admin access is granted via role check in RLS
-- This ensures non-admin users cannot access audit logs even if frontend is bypassed
-- Pattern: All admin policies use public.is_admin_user() helper function to avoid RLS recursion
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- ADMIN_AUDIT_LOGS TABLE - Admin-only SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view admin audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can view admin audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin_user());

-- Note: Regular users cannot INSERT directly - only via Edge Functions or service role
-- Edge Functions use service role, so they can insert

-- ============================================================================
-- GRANT PERMISSIONS FOR SERVICE ROLE (Edge Functions)
-- ============================================================================

-- Grant INSERT permission to service role (for Edge Functions)
GRANT INSERT ON public.admin_audit_logs TO service_role;

-- Grant SELECT permission to service role (for Edge Functions that need to read logs)
GRANT SELECT ON public.admin_audit_logs TO service_role;

-- ============================================================================
-- ADD COMMENT
-- ============================================================================

COMMENT ON POLICY "Admins can view admin audit logs" ON public.admin_audit_logs IS 
'Allows only admin users to view audit logs. Uses is_admin_user() helper function to avoid RLS recursion.';