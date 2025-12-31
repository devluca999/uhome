-- Add phone and notes fields to tenants table
-- Run this in Supabase SQL Editor

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS phone TEXT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.phone IS 'Tenant phone number (optional)';
COMMENT ON COLUMN public.tenants.notes IS 'Free-form notes about the tenant (markdown supported)';

