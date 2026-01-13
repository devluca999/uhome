-- Create expenses table for upkeep cost tracking (IDEMPOTENT VERSION)
-- This version can be run safely even if table/policies already exist
-- Run this in Supabase SQL Editor

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  category TEXT CHECK (category IN ('maintenance', 'utilities', 'repairs')) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Landlords can view expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Landlords can insert expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Landlords can update expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Landlords can delete expenses for their properties" ON public.expenses;

-- RLS Policy: Landlords can manage expenses for their own properties
CREATE POLICY "Landlords can view expenses for their properties"
  ON public.expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = expenses.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can insert expenses for their properties"
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = expenses.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update expenses for their properties"
  ON public.expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = expenses.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete expenses for their properties"
  ON public.expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = expenses.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS expenses_updated_at ON public.expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

