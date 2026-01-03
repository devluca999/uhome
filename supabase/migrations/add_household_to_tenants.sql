-- Add household_id to tenants table
-- Run this in Supabase SQL Editor

-- Add household_id column (nullable for backward compatibility during migration)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

-- Add index for household_id
CREATE INDEX IF NOT EXISTS idx_tenants_household_id ON public.tenants(household_id) WHERE household_id IS NOT NULL;

-- Note: We keep property_id temporarily for backward compatibility
-- During migration, households will be created and linked
-- Eventually property_id can be derived from household -> property relationship

-- Add comment
COMMENT ON COLUMN public.tenants.household_id IS 'Household this tenant belongs to. Multiple tenant users can belong to one household. Migrated from direct property link during lazy migration.';

