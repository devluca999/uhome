-- Add admin console tables: waitlist, promo_codes, newsletter_campaigns, leads
-- These tables support Phase 5: Sys Admin / Internal Ops Console

-- Waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT, -- 'form', 'import', 'scraper', etc.
  status TEXT CHECK (status IN ('pending', 'invited', 'converted', 'removed')) NOT NULL DEFAULT 'pending',
  converted_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('percentage', 'fixed', 'trial_extension')) NOT NULL,
  value NUMERIC(10, 2) NOT NULL, -- Percentage (0-100) or fixed amount, or days for trial
  usage_limit INTEGER, -- NULL = unlimited
  usage_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter campaigns table
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown or HTML
  topic TEXT, -- Predefined category
  style_preset TEXT, -- Template name
  sent_at TIMESTAMP WITH TIME ZONE,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table (enhanced in Phase 10)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  company TEXT,
  source TEXT NOT NULL, -- 'manual_upload', 'scraper', 'apify', 'apollo', 'form', etc.
  status TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')) NOT NULL DEFAULT 'new',
  icp_tags JSONB, -- Array of ICP tags
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  dedupe_hash TEXT, -- Hash for deduplication
  metadata JSONB, -- Additional source-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_source ON public.waitlist(source);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON public.promo_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_sent_at ON public.newsletter_campaigns(sent_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_topic ON public.newsletter_campaigns(topic);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_dedupe_hash ON public.leads(dedupe_hash);

-- RLS Policies
-- Waitlist: Admin-only access
CREATE POLICY "Only admins can view waitlist"
  ON public.waitlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert waitlist"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update waitlist"
  ON public.waitlist
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Promo codes: Admin-only access
CREATE POLICY "Only admins can view promo codes"
  ON public.promo_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage promo codes"
  ON public.promo_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Newsletter campaigns: Admin-only access
CREATE POLICY "Only admins can view newsletter campaigns"
  ON public.newsletter_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage newsletter campaigns"
  ON public.newsletter_campaigns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Leads: Admin-only access
CREATE POLICY "Only admins can view leads"
  ON public.leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage leads"
  ON public.leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE public.waitlist IS 'Waitlist for early access. Tracks signups before public launch.';
COMMENT ON TABLE public.promo_codes IS 'Promotional codes for discounts and trial extensions.';
COMMENT ON TABLE public.newsletter_campaigns IS 'Newsletter campaigns sent to users and leads.';
COMMENT ON TABLE public.leads IS 'Lead ingestion system. Tracks potential customers from various sources.';
