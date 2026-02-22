-- Create tenant_invites table for tenant invitation system
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tenant_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Landlords can view invites for their properties"
  ON public.tenant_invites
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can create invites for their properties"
  ON public.tenant_invites
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete invites for their properties"
  ON public.tenant_invites
  FOR DELETE
  USING (
    created_by = auth.uid() OR
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Allow anyone to read invites by token (for acceptance flow)
CREATE POLICY "Anyone can view invite by token"
  ON public.tenant_invites
  FOR SELECT
  USING (true); -- Token will be validated in application logic

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON public.tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_property_id ON public.tenant_invites(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email ON public.tenant_invites(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_created_by ON public.tenant_invites(created_by);

-- Add comment
COMMENT ON TABLE public.tenant_invites IS 'Tenant invitation system. Landlords can generate invite links that tenants can accept to unlock tenant UI access.';

