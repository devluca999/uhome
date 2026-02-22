-- Add house rules visibility toggle to properties table
-- Run this in Supabase SQL Editor

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS rules_visible_to_tenants BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.properties.rules_visible_to_tenants IS 'Whether house rules are visible to tenants (read-only for tenants when true)';

