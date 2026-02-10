-- Add release version control tables
-- Supports Phase 8: Sys Admin Release Version Control

-- App releases table
CREATE TABLE IF NOT EXISTS public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE, -- Semantic version (e.g., "1.2.3")
  codename TEXT, -- Release codename (e.g., "Phoenix")
  commit_hash TEXT NOT NULL, -- Git commit hash at deployment
  deployed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deployed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('active', 'rolled_back', 'pending', 'superseded')) NOT NULL DEFAULT 'pending',
  release_notes TEXT, -- Markdown-formatted release notes
  is_active BOOLEAN NOT NULL DEFAULT false, -- Only one active release per environment
  environment TEXT CHECK (environment IN ('staging', 'production')) NOT NULL DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- Feature flag identifier (e.g., "ENABLE_STRIPE_CONNECT")
  enabled BOOLEAN NOT NULL DEFAULT false,
  scope TEXT CHECK (scope IN ('global', 'user', 'organization', 'property')) NOT NULL DEFAULT 'global',
  release_id UUID REFERENCES public.app_releases(id) ON DELETE SET NULL, -- Which release introduced this flag
  default_value BOOLEAN NOT NULL DEFAULT false, -- Default state for new users/orgs
  description TEXT, -- Human-readable description
  environment TEXT CHECK (environment IN ('staging', 'production')) NOT NULL DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Release events table (audit trail)
CREATE TABLE IF NOT EXISTS public.release_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.app_releases(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('deploy', 'rollback', 'manual_override', 'feature_flag_change')) NOT NULL,
  actor UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Admin user who performed action
  reason TEXT, -- Optional reason/notes
  metadata JSONB, -- Additional context (feature flags changed, config diffs, etc.)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment TEXT CHECK (environment IN ('staging', 'production')) NOT NULL DEFAULT 'production'
);

-- Enable RLS
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_events ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_app_releases_version ON public.app_releases(version);
CREATE INDEX IF NOT EXISTS idx_app_releases_environment ON public.app_releases(environment);
CREATE INDEX IF NOT EXISTS idx_app_releases_status ON public.app_releases(status);
CREATE INDEX IF NOT EXISTS idx_app_releases_is_active ON public.app_releases(is_active, environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON public.feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_release_events_release_id ON public.release_events(release_id);
CREATE INDEX IF NOT EXISTS idx_release_events_actor ON public.release_events(actor);
CREATE INDEX IF NOT EXISTS idx_release_events_timestamp ON public.release_events(timestamp DESC);

-- RLS Policies
-- App releases: Admin-only access
CREATE POLICY "Only admins can view app releases"
  ON public.app_releases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage app releases"
  ON public.app_releases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Feature flags: Admin-only access
CREATE POLICY "Only admins can view feature flags"
  ON public.feature_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Release events: Admin-only access (immutable audit trail)
CREATE POLICY "Only admins can view release events"
  ON public.release_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert release events"
  ON public.release_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE public.app_releases IS 'Tracks application releases with version numbers, deployment timestamps, and status. Supports staging and production environments.';
COMMENT ON TABLE public.feature_flags IS 'Feature flags for runtime feature toggling. Scoped by environment (staging vs production).';
COMMENT ON TABLE public.release_events IS 'Immutable audit trail for all release-related actions (deploy, rollback, manual override, feature flag changes).';
