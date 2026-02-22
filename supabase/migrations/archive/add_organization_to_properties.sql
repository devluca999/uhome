-- Add organization_id to properties table
-- Run this in Supabase SQL Editor

-- Add organization_id column (nullable for backward compatibility during migration)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add index for organization_id
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON public.properties(organization_id) WHERE organization_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.properties.organization_id IS 'Organization that owns this property. Properties belong to organizations, not individual users. Migrated from owner_id during lazy migration.';

