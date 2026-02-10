-- Add scraper tables for Phase 6: Lead Scraper
-- Supports kill switch and scraper run tracking

-- Scraper runs table
CREATE TABLE IF NOT EXISTS public.scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  leads_found INTEGER NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'killed')) NOT NULL DEFAULT 'running',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scraper kill switch table
CREATE TABLE IF NOT EXISTS public.scraper_kill_switch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default kill switch record (disabled by default)
INSERT INTO public.scraper_kill_switch (enabled, reason)
VALUES (false, 'Default state - scraper enabled')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_kill_switch ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started_at ON public.scraper_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status ON public.scraper_runs(status);

-- RLS Policies
-- Scraper runs: Admin-only access
CREATE POLICY "Only admins can view scraper runs"
  ON public.scraper_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Scraper kill switch: Admin-only access
CREATE POLICY "Only admins can view kill switch"
  ON public.scraper_kill_switch
  FOR SELECT
  USING (true); -- Allow read for scraper to check status

CREATE POLICY "Only admins can update kill switch"
  ON public.scraper_kill_switch
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE public.scraper_runs IS 'Tracks scraper execution runs. Used for monitoring and audit.';
COMMENT ON TABLE public.scraper_kill_switch IS 'Kill switch for scraper. When enabled=true, scraper stops all operations immediately.';
