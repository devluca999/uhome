-- Create quota enforcement functions
-- Run this in Supabase SQL Editor
-- IMPORTANT: These functions check and enforce quotas based on admin_quota_config table
-- Different limits for staging vs production (via staging_multiplier)
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- FUNCTION: Check if environment is staging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_staging_environment()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  -- Check if Supabase URL contains staging indicators
  -- Note: This checks a config value or environment variable
  -- For now, we'll use a conservative default (assume production)
  -- This can be set via a config table or environment variable
  SELECT COALESCE(
    (SELECT value::boolean FROM public.admin_quota_config 
     WHERE role = 'admin' AND quota_type = 'uploads_per_day' 
     LIMIT 1) IS NULL, -- Default to false if not set
    false
  );
$$;

-- Alternative: Use a dedicated config table or environment check
-- For simplicity, we'll check staging via a multiplier flag passed to functions

-- ============================================================================
-- FUNCTION: Check if user has remaining quota
-- ============================================================================

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
  IF p_quota_type = 'uploads_per_day' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.admin_upload_logs
    WHERE user_id = encode(digest(p_user_id::text, 'sha256'), 'hex') -- Match anonymized format
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

-- ============================================================================
-- FUNCTION: Enforce quota before operation
-- ============================================================================

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
