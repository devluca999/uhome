-- Add property type system
-- Run this in Supabase SQL Editor

-- Add property_type field to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS property_type TEXT NULL;

-- Create user_property_types table for custom property types
CREATE TABLE IF NOT EXISTS public.user_property_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type_name)
);

-- Enable RLS
ALTER TABLE public.user_property_types ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own custom property types
CREATE POLICY "Users can view their own property types"
  ON public.user_property_types
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own property types"
  ON public.user_property_types
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own property types"
  ON public.user_property_types
  FOR DELETE
  USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON COLUMN public.properties.property_type IS 'Property type: studio, 1-bedroom, 2-bedroom, house, other, or custom user-defined type';
COMMENT ON TABLE public.user_property_types IS 'Custom property types defined by individual landlords';

