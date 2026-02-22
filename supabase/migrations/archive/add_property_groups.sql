-- Add property grouping system
-- Run this in Supabase SQL Editor

-- Create property_groups table
CREATE TABLE IF NOT EXISTS public.property_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('city', 'ownership', 'custom')) NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property_group_assignments junction table
CREATE TABLE IF NOT EXISTS public.property_group_assignments (
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.property_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, group_id)
);

-- Enable RLS
ALTER TABLE public.property_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_group_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_groups
CREATE POLICY "Users can view their own property groups"
  ON public.property_groups
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own property groups"
  ON public.property_groups
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own property groups"
  ON public.property_groups
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own property groups"
  ON public.property_groups
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for property_group_assignments
CREATE POLICY "Users can view assignments for their properties"
  ON public.property_group_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_group_assignments.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert assignments for their properties"
  ON public.property_group_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_group_assignments.property_id
      AND properties.owner_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.property_groups
      WHERE property_groups.id = property_group_assignments.group_id
      AND property_groups.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete assignments for their properties"
  ON public.property_group_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_group_assignments.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.property_groups IS 'Property grouping labels (city, ownership, custom) for organizing properties';
COMMENT ON TABLE public.property_group_assignments IS 'Junction table linking properties to groups (many-to-many)';

