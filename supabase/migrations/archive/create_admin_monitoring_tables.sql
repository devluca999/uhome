-- Create admin monitoring tables for performance, uploads, and security tracking
-- Run this in Supabase SQL Editor
-- IMPORTANT: These tables store anonymized monitoring data accessible only to sys-admin users
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- ADMIN_METRICS TABLE - Performance metrics tracking
-- ============================================================================

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

-- Add comment for documentation
COMMENT ON TABLE public.admin_metrics IS 'Performance metrics tracking for admin monitoring. Stores anonymized page load times, API call durations, and component render times.';

-- ============================================================================
-- ADMIN_UPLOAD_LOGS TABLE - File upload tracking
-- ============================================================================

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

-- Add comment for documentation
COMMENT ON TABLE public.admin_upload_logs IS 'File upload tracking for admin monitoring. Stores anonymized upload logs including file size, type, duration, and success/failure status.';

-- ============================================================================
-- ADMIN_SECURITY_LOGS TABLE - Security events tracking
-- ============================================================================

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

-- Add comment for documentation
COMMENT ON TABLE public.admin_security_logs IS 'Security events tracking for admin monitoring. Stores anonymized security logs including failed logins, invalid API calls, rate limit violations, and suspicious activity.';

-- ============================================================================
-- ADMIN_QUOTA_CONFIG TABLE - Quota limits per role (configurable)
-- ============================================================================

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

-- Add comment for documentation
COMMENT ON TABLE public.admin_quota_config IS 'Configurable quota limits per user role. Admins can update limits via SQL. Staging multiplier allows higher limits for testing environments.';
