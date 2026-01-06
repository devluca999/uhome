-- Make property_id nullable in tenants table
-- This allows tenants to be unlinked from properties while preserving their records
-- Per tenant lifecycle: tenants persist even after move-out

ALTER TABLE public.tenants
ALTER COLUMN property_id DROP NOT NULL;

-- Update the unique constraint to allow multiple unlinked tenants
-- Remove the old constraint if it exists
ALTER TABLE public.tenants
DROP CONSTRAINT IF EXISTS tenants_user_id_property_id_key;

-- Add new constraint that allows null property_id
-- This allows a user to have multiple tenant records (one per property, plus unlinked ones)
CREATE UNIQUE INDEX IF NOT EXISTS tenants_user_id_property_id_unique 
ON public.tenants(user_id, property_id) 
WHERE property_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.tenants.property_id IS 'Property this tenant is linked to. NULL if tenant is unlinked (moved out but record preserved).';

