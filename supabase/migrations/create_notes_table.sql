-- Create notes table for polymorphic notes system
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type TEXT CHECK (entity_type IN ('property', 'tenant', 'rent_record', 'expense')) NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own notes
CREATE POLICY "Users can view their own notes"
  ON public.notes
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notes"
  ON public.notes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notes"
  ON public.notes
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON public.notes
  FOR DELETE
  USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_updated_at();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notes_entity ON public.notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);

-- Add comment for documentation
COMMENT ON TABLE public.notes IS 'Polymorphic notes system. Notes can be attached to properties, tenants, rent records, or expenses. Markdown formatting supported.';

