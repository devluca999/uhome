-- Create households table for tenant grouping
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_households_property_id ON public.households(property_id);

-- Add comment for documentation
COMMENT ON TABLE public.households IS 'Tenant grouping. Multiple tenant users can belong to one household (e.g., spouses, roommates). Households are linked to properties. Tenant accounts persist even after move-out (household unlinked from property).';

