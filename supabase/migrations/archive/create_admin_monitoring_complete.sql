-- ============================================================================
-- ADMIN MONITORING SYSTEM - Complete Migration
-- ============================================================================
-- This script creates all admin monitoring tables, RLS policies, and quota functions
-- Run this in Supabase SQL Editor on your database (staging or production)
-- IMPORTANT: Run this entire script in one go
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- STEP 1: CREATE ADMIN MONITORING TABLES
-- ============================================================================

-- ADMIN_METRICS TABLE - Performance metrics tracking
CREATE TABLE IF NOT EXISTS public.admin_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Anonymized user ID (hashed)
  user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('page_load', 'api_call', 'component_render')),
  page_path TEXT,
  metric_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_metrics ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_metrics_created_at ON public.admin_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_metric_type ON public.admin_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_user_role ON public.admin_metrics(user_role);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_page_path ON public.admin_metrics(page_path);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_type_created ON public.admin_metrics(metric_type, created_at DESC);

-- Add comment
COMMENT ON TABLE public.admin_metrics IS 'Performance metrics tracking for admin monitoring. Stores anonymized page load times, API call durations, and component render times.';

-- ADMIN_UPLOAD_LOGS TABLE - File upload tracking
CREATE TABLE IF NOT EXISTS public.admin_upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Anonymized user ID (hashed)
  user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  bucket TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_duration_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  storage_url TEXT, -- Anonymized storage URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_upload_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_upload_logs_created_at ON public.admin_upload_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_upload_logs_status ON public.admin_upload_logs(status);
CREATE INDEX IF NOT EXISTS idx_admin_upload_logs_user_role ON public.admin_upload_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_admin_upload_logs_bucket ON public.admin_upload_logs(bucket);
CREATE INDEX IF NOT EXISTS idx_admin_upload_logs_status_created ON public.admin_upload_logs(status, created_at DESC);

-- Add comment
COMMENT ON TABLE public.admin_upload_logs IS 'File upload tracking for admin monitoring. Stores anonymized upload logs including file size, type, duration, and success/failure status.';

-- ADMIN_SECURITY_LOGS TABLE - Security events tracking
CREATE TABLE IF NOT EXISTS public.admin_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- Anonymized user ID (hashed) - nullable for anonymous events
  user_role TEXT CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_login', 'invalid_api_call', 'rate_limit_exceeded', 'suspicious_activity')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  ip_address TEXT, -- Hashed IP address
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_security_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_created_at ON public.admin_security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_event_type ON public.admin_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_severity ON public.admin_security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_event_severity ON public.admin_security_logs(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_type_created ON public.admin_security_logs(event_type, created_at DESC);

-- Add comment
COMMENT ON TABLE public.admin_security_logs IS 'Security events tracking for admin monitoring. Stores anonymized security logs including failed logins, invalid API calls, rate limit violations, and suspicious activity.';

-- ADMIN_QUOTA_CONFIG TABLE - Quota limits per role (configurable)
CREATE TABLE IF NOT EXISTS public.admin_quota_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('tenant', 'landlord', 'admin')),
  quota_type TEXT NOT NULL CHECK (quota_type IN ('uploads_per_day', 'api_calls_per_hour', 'messages_per_minute', 'invites_per_day')),
  limit_value INTEGER NOT NULL,
  staging_multiplier DECIMAL(3, 2) DEFAULT 2.0, -- Multiplier for staging environment
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, quota_type)
);

-- Enable RLS
ALTER TABLE public.admin_quota_config ENABLE ROW LEVEL SECURITY;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_admin_quota_config_role_type ON public.admin_quota_config(role, quota_type);

-- Insert default quota configuration
INSERT INTO public.admin_quota_config (role, quota_type, limit_value, staging_multiplier) VALUES
  ('tenant', 'uploads_per_day', 10, 2.0),
  ('landlord', 'uploads_per_day', 50, 2.0),
  ('admin', 'uploads_per_day', 200, 2.0),
  ('tenant', 'api_calls_per_hour', 100, 2.0),
  ('landlord', 'api_calls_per_hour', 500, 2.0),
  ('admin', 'api_calls_per_hour', 2000, 2.0),
  ('tenant', 'messages_per_minute', 20, 2.0),
  ('landlord', 'messages_per_minute', 40, 2.0),
  ('admin', 'messages_per_minute', 100, 2.0),
  ('tenant', 'invites_per_day', 5, 1.0),
  ('landlord', 'invites_per_day', 20, 1.0),
  ('admin', 'invites_per_day', 100, 1.0)
ON CONFLICT (role, quota_type) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  staging_multiplier = EXCLUDED.staging_multiplier,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE public.admin_quota_config IS 'Configurable quota limits per user role. Admins can update limits via SQL. Staging multiplier allows higher limits for testing environments.';

-- ============================================================================
-- STEP 2: CREATE RLS POLICIES
-- ============================================================================

-- Ensure is_admin_user() function exists (may already exist from other migrations)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- ADMIN_METRICS TABLE - Admin-only SELECT
DROP POLICY IF EXISTS "Admins can view admin metrics" ON public.admin_metrics;
CREATE POLICY "Admins can view admin metrics"
  ON public.admin_metrics FOR SELECT
  USING (public.is_admin_user());

-- ADMIN_UPLOAD_LOGS TABLE - Admin-only SELECT
DROP POLICY IF EXISTS "Admins can view admin upload logs" ON public.admin_upload_logs;
CREATE POLICY "Admins can view admin upload logs"
  ON public.admin_upload_logs FOR SELECT
  USING (public.is_admin_user());

-- ADMIN_SECURITY_LOGS TABLE - Admin-only SELECT
DROP POLICY IF EXISTS "Admins can view admin security logs" ON public.admin_security_logs;
CREATE POLICY "Admins can view admin security logs"
  ON public.admin_security_logs FOR SELECT
  USING (public.is_admin_user());

-- ADMIN_QUOTA_CONFIG TABLE - Admin-only SELECT and UPDATE
DROP POLICY IF EXISTS "Admins can view quota config" ON public.admin_quota_config;
CREATE POLICY "Admins can view quota config"
  ON public.admin_quota_config FOR SELECT
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update quota config" ON public.admin_quota_config;
CREATE POLICY "Admins can update quota config"
  ON public.admin_quota_config FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Grant permissions for service role (Edge Functions)
GRANT INSERT ON public.admin_metrics TO service_role;
GRANT INSERT ON public.admin_upload_logs TO service_role;
GRANT INSERT ON public.admin_security_logs TO service_role;
GRANT SELECT ON public.admin_quota_config TO service_role;

-- ============================================================================
-- STEP 3: CREATE QUOTA ENFORCEMENT FUNCTIONS
-- ============================================================================

-- FUNCTION: Check if user has remaining quota
CREATE OR REPLACE FUNCTION public.check_quota(
  p_user_id UUID,
  p_quota_type TEXT,
  p_is_staging BOOLEAN DEFAULT false
)
RETURNS TABLE (
  has_quota BOOLEAN,
  limit_value INTEGER,
  used_count INTEGER,
  remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_limit INTEGER;
  v_multiplier DECIMAL(3, 2);
  v_effective_limit INTEGER;
  v_used_count INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    -- User not found, deny
    RETURN QUERY SELECT false, 0, 0, 0;
    RETURN;
  END IF;

  -- Get quota configuration
  SELECT limit_value, staging_multiplier
  INTO v_limit, v_multiplier
  FROM public.admin_quota_config
  WHERE role = v_user_role
    AND quota_type = p_quota_type;

  IF v_limit IS NULL THEN
    -- No quota configured for this role/type, allow (no limit)
    RETURN QUERY SELECT true, 0, 0, 0;
    RETURN;
  END IF;

  -- Calculate effective limit (apply staging multiplier if staging)
  IF p_is_staging THEN
    v_effective_limit := FLOOR(v_limit * v_multiplier);
  ELSE
    v_effective_limit := v_limit;
  END IF;

  -- Count usage based on quota type
  -- Note: This uses anonymized user_id from admin tables
  -- For rate_limit_tracking, we use actual user_id
  IF p_quota_type = 'uploads_per_day' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.admin_upload_logs
    WHERE user_id = encode(digest(p_user_id::text, 'sha256'), 'hex')
      AND DATE(created_at) = CURRENT_DATE
      AND status = 'success';
  ELSIF p_quota_type = 'api_calls_per_hour' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.admin_metrics
    WHERE user_id = encode(digest(p_user_id::text, 'sha256'), 'hex')
      AND metric_type = 'api_call'
      AND created_at >= NOW() - INTERVAL '1 hour';
  ELSIF p_quota_type = 'messages_per_minute' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.rate_limit_tracking
    WHERE user_id = p_user_id
      AND action_type = 'message'
      AND created_at >= NOW() - INTERVAL '1 minute';
  ELSIF p_quota_type = 'invites_per_day' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.rate_limit_tracking
    WHERE user_id = p_user_id
      AND action_type = 'invite'
      AND DATE(created_at) = CURRENT_DATE;
  ELSE
    -- Unknown quota type, allow
    RETURN QUERY SELECT true, v_effective_limit, 0, v_effective_limit;
    RETURN;
  END IF;

  -- Calculate remaining
  v_remaining := GREATEST(0, v_effective_limit - v_used_count);

  -- Return result
  RETURN QUERY SELECT
    v_remaining > 0 AS has_quota,
    v_effective_limit AS limit_value,
    v_used_count AS used_count,
    v_remaining AS remaining;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_quota(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_quota(UUID, TEXT, BOOLEAN) TO service_role;

-- FUNCTION: Enforce quota before operation
CREATE OR REPLACE FUNCTION public.enforce_quota(
  p_user_id UUID,
  p_quota_type TEXT,
  p_is_staging BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Check quota
  SELECT * INTO v_result
  FROM public.check_quota(p_user_id, p_quota_type, p_is_staging)
  LIMIT 1;

  -- If no quota remaining, raise exception
  IF NOT v_result.has_quota THEN
    RAISE EXCEPTION 'Quota exceeded for %: %/% used. Limit: %. Remaining: %.',
      p_quota_type,
      v_result.used_count,
      v_result.limit_value,
      v_result.limit_value,
      v_result.remaining;
  END IF;

  -- Return remaining quota
  RETURN v_result.remaining;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.enforce_quota(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_quota(UUID, TEXT, BOOLEAN) TO service_role;

-- Add comments
COMMENT ON FUNCTION public.check_quota(UUID, TEXT, BOOLEAN) IS 'Check if user has remaining quota for given quota type. Returns has_quota, limit_value, used_count, and remaining.';
COMMENT ON FUNCTION public.enforce_quota(UUID, TEXT, BOOLEAN) IS 'Enforce quota before operation. Raises exception if quota exceeded, otherwise returns remaining quota.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables were created
SELECT 
  'Tables created' as status,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('admin_metrics', 'admin_upload_logs', 'admin_security_logs', 'admin_quota_config');

-- Verify RLS is enabled
SELECT 
  'RLS enabled' as status,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('admin_metrics', 'admin_upload_logs', 'admin_security_logs', 'admin_quota_config');

-- Verify quota config has default values
SELECT 
  'Quota config' as status,
  COUNT(*) as config_count
FROM public.admin_quota_config;
