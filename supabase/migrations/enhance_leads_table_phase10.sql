-- Enhance leads table for Phase 10: Hybrid Lead Ingestion System
-- Adds fields for manual upload, normalization, and deduplication

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS icp_tags JSONB,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_event_id UUID, -- Will reference lead_import_events table
  ADD COLUMN IF NOT EXISTS opt_in_status TEXT CHECK (opt_in_status IN ('opted_in', 'opted_out', 'pending', 'unknown')) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS normalized_email TEXT, -- Lowercase email for deduplication
  ADD COLUMN IF NOT EXISTS normalized_phone TEXT, -- E.164 format for deduplication
  ADD COLUMN IF NOT EXISTS dedupe_hash TEXT, -- Hash of email+phone for fast lookup
  ADD COLUMN IF NOT EXISTS metadata JSONB; -- Additional source-specific data

-- Create lead_import_events table
CREATE TABLE IF NOT EXISTS public.lead_import_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'manual_upload', 'scraper', 'api', etc.
  file_name TEXT, -- Original filename (for manual uploads)
  file_type TEXT, -- 'csv', 'json', 'excel'
  rows_processed INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_duplicates INTEGER NOT NULL DEFAULT 0,
  rows_errors INTEGER NOT NULL DEFAULT 0,
  actor UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  environment TEXT CHECK (environment IN ('staging', 'production')) NOT NULL DEFAULT 'production',
  sandbox_mode BOOLEAN NOT NULL DEFAULT false,
  field_mapping JSONB, -- Field mapping used (for manual uploads)
  import_settings JSONB, -- Waitlist/newsletter enrollment settings
  error_log JSONB, -- Array of error details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create lead_field_mappings table (for saved mapping templates)
CREATE TABLE IF NOT EXISTS public.lead_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Template name
  source_type TEXT NOT NULL, -- 'csv', 'json', 'excel', 'apify', etc.
  mapping JSONB NOT NULL, -- Column/field mapping configuration
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for import_event_id
ALTER TABLE public.leads
  ADD CONSTRAINT leads_import_event_id_fkey 
  FOREIGN KEY (import_event_id) 
  REFERENCES public.lead_import_events(id) 
  ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_leads_normalized_email ON public.leads(normalized_email);
CREATE INDEX IF NOT EXISTS idx_leads_normalized_phone ON public.leads(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_leads_dedupe_hash ON public.leads(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_leads_import_event_id ON public.leads(import_event_id);
CREATE INDEX IF NOT EXISTS idx_lead_import_events_actor ON public.lead_import_events(actor);
CREATE INDEX IF NOT EXISTS idx_lead_import_events_environment ON public.lead_import_events(environment);
CREATE INDEX IF NOT EXISTS idx_lead_field_mappings_created_by ON public.lead_field_mappings(created_by);

-- Enable RLS
ALTER TABLE public.lead_import_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_field_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_import_events
CREATE POLICY "Only admins can view import events"
  ON public.lead_import_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert import events"
  ON public.lead_import_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for lead_field_mappings
CREATE POLICY "Only admins can view field mappings"
  ON public.lead_field_mappings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage field mappings"
  ON public.lead_field_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE public.lead_import_events IS 'Tracks all lead import operations (manual uploads, scraper imports, API imports). Provides audit trail and error tracking.';
COMMENT ON TABLE public.lead_field_mappings IS 'Saved field mapping templates for manual uploads. Allows reusing mappings for consistent imports.';
