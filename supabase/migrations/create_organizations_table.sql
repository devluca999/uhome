-- Create organizations table for landlord workspaces
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON public.organizations(created_at);

-- Add comment for documentation
COMMENT ON TABLE public.organizations IS 'Landlord workspaces. Each organization represents a landlord account/workspace that owns properties and subscriptions. Organizations are auto-created on first landlord access.';

