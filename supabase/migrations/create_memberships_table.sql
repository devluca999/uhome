-- Create memberships table for user-organization relationships with roles
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'collaborator', 'tenant')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON public.memberships(role);
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON public.memberships(organization_id, user_id);

-- Add comment for documentation
COMMENT ON TABLE public.memberships IS 'User-organization relationships with roles. Roles: owner (full access), collaborator (Pro plan only, limited access), tenant (read-only access to linked properties).';

