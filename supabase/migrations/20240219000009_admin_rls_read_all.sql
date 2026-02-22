-- Admin RLS and monitoring tables
-- Uses a SECURITY DEFINER helper to avoid RLS recursion when checking admin role

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

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- Users table: allow admins to read ALL user rows
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (
  auth.uid() = id
  OR public.is_admin_user()
  OR id IN (SELECT user_id FROM public.tenants WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()))
);

-- Admin monitoring tables

CREATE TABLE IF NOT EXISTS public.admin_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('page_load', 'api_call', 'component_render')),
  page_path TEXT,
  metric_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admin_metrics ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_metrics_created_at ON public.admin_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_metric_type ON public.admin_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_type_created ON public.admin_metrics(metric_type, created_at DESC);

DROP POLICY IF EXISTS "Admins can view admin metrics" ON public.admin_metrics;
CREATE POLICY "Admins can view admin metrics" ON public.admin_metrics FOR SELECT USING (public.is_admin_user());
DROP POLICY IF EXISTS "Anyone can insert admin metrics" ON public.admin_metrics;
CREATE POLICY "Anyone can insert admin metrics" ON public.admin_metrics FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.admin_upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  bucket TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_duration_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  storage_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admin_upload_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_upload_logs_created_at ON public.admin_upload_logs(created_at DESC);

DROP POLICY IF EXISTS "Admins can view upload logs" ON public.admin_upload_logs;
CREATE POLICY "Admins can view upload logs" ON public.admin_upload_logs FOR SELECT USING (public.is_admin_user());
DROP POLICY IF EXISTS "Anyone can insert upload logs" ON public.admin_upload_logs;
CREATE POLICY "Anyone can insert upload logs" ON public.admin_upload_logs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.admin_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_role TEXT CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_login', 'invalid_api_call', 'rate_limit_exceeded', 'suspicious_activity')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admin_security_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_created_at ON public.admin_security_logs(created_at DESC);

DROP POLICY IF EXISTS "Admins can view security logs" ON public.admin_security_logs;
CREATE POLICY "Admins can view security logs" ON public.admin_security_logs FOR SELECT USING (public.is_admin_user());
DROP POLICY IF EXISTS "Anyone can insert security logs" ON public.admin_security_logs;
CREATE POLICY "Anyone can insert security logs" ON public.admin_security_logs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (public.is_admin_user());
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.is_admin_user());
