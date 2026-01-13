-- Rate Limit Tracking Tables
-- Tracks user actions for rate limiting enforcement
-- Run this in Supabase SQL Editor

-- ============================================================================
-- RATE_LIMIT_TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'message', 'invite', 'work_order', 'checklist', 'other')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view their own tracking records
CREATE POLICY "Users can view their own rate limit tracking"
  ON public.rate_limit_tracking
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert (for Edge Functions)
-- Note: Edge Functions use service role, so they can insert
-- Regular users cannot insert directly (only via Edge Functions)

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_id ON public.rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_action_type ON public.rate_limit_tracking(action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_created_at ON public.rate_limit_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_action_created ON public.rate_limit_tracking(user_id, action_type, created_at DESC);

-- ============================================================================
-- ABUSE_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.abuse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'message', 'invite', 'work_order', 'checklist', 'other')),
  violation_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  rate_limit_violation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.abuse_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view their own abuse events
CREATE POLICY "Users can view their own abuse events"
  ON public.abuse_events
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert (for Edge Functions)
-- Note: Edge Functions use service role, so they can insert
-- Regular users cannot insert directly (only via Edge Functions)

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_abuse_events_user_id ON public.abuse_events(user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_events_action_type ON public.abuse_events(action_type);
CREATE INDEX IF NOT EXISTS idx_abuse_events_violation_type ON public.abuse_events(violation_type);
CREATE INDEX IF NOT EXISTS idx_abuse_events_rate_limit_violation ON public.abuse_events(rate_limit_violation);
CREATE INDEX IF NOT EXISTS idx_abuse_events_created_at ON public.abuse_events(created_at);
CREATE INDEX IF NOT EXISTS idx_abuse_events_user_violation_created ON public.abuse_events(user_id, rate_limit_violation, created_at DESC);

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up old rate limit tracking records (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_tracking()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limit_tracking
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old abuse events (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_abuse_events()
RETURNS void AS $$
BEGIN
  DELETE FROM public.abuse_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.rate_limit_tracking IS 'Tracks user actions for rate limiting. Records are cleaned up after 7 days.';
COMMENT ON TABLE public.abuse_events IS 'Logs abuse events and rate limit violations. Records are kept for 30 days for analysis.';
COMMENT ON COLUMN public.rate_limit_tracking.action_type IS 'Type of action: upload, message, invite, work_order, checklist, or other';
COMMENT ON COLUMN public.abuse_events.violation_type IS 'Type of violation: rate_limit_per_minute, rate_limit_per_day, file_size_exceeded, empty_message, burst_activity, suspicious_activity, etc.';

