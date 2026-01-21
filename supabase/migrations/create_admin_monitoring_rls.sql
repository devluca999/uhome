-- Create RLS policies for admin monitoring tables
-- Run this in Supabase SQL Editor
-- IMPORTANT: Admin access is granted via role check in RLS
-- This ensures non-admin users cannot access admin monitoring data even if frontend is bypassed
-- Pattern: All admin policies use public.is_admin_user() helper function to avoid RLS recursion
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- ADMIN_METRICS TABLE - Admin-only SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view admin metrics" ON public.admin_metrics;

CREATE POLICY "Admins can view admin metrics"
  ON public.admin_metrics FOR SELECT
  USING (public.is_admin_user());

-- Note: Regular users cannot INSERT directly - only via Edge Functions or service role
-- Edge Functions use service role, so they can insert

-- ============================================================================
-- ADMIN_UPLOAD_LOGS TABLE - Admin-only SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view admin upload logs" ON public.admin_upload_logs;

CREATE POLICY "Admins can view admin upload logs"
  ON public.admin_upload_logs FOR SELECT
  USING (public.is_admin_user());

-- Note: Regular users cannot INSERT directly - only via Edge Functions or service role
-- Edge Functions use service role, so they can insert

-- ============================================================================
-- ADMIN_SECURITY_LOGS TABLE - Admin-only SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view admin security logs" ON public.admin_security_logs;

CREATE POLICY "Admins can view admin security logs"
  ON public.admin_security_logs FOR SELECT
  USING (public.is_admin_user());

-- Note: Regular users cannot INSERT directly - only via Edge Functions or service role
-- Edge Functions use service role, so they can insert

-- ============================================================================
-- ADMIN_QUOTA_CONFIG TABLE - Admin-only SELECT and UPDATE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view quota config" ON public.admin_quota_config;

CREATE POLICY "Admins can view quota config"
  ON public.admin_quota_config FOR SELECT
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update quota config" ON public.admin_quota_config;

CREATE POLICY "Admins can update quota config"
  ON public.admin_quota_config FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Note: INSERT is only allowed via service role or admin SQL
-- UPDATE is allowed for admins to modify quotas

-- ============================================================================
-- GRANT PERMISSIONS FOR SERVICE ROLE (Edge Functions)
-- ============================================================================

-- Grant INSERT permission to service_role for logging (Edge Functions use service role)
GRANT INSERT ON public.admin_metrics TO service_role;
GRANT INSERT ON public.admin_upload_logs TO service_role;
GRANT INSERT ON public.admin_security_logs TO service_role;

-- Grant SELECT to service_role for quota checking
GRANT SELECT ON public.admin_quota_config TO service_role;
