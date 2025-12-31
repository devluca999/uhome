-- Create leases table for lease metadata
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_start_date DATE NOT NULL,
  lease_end_date DATE NULL,
  lease_type TEXT CHECK (lease_type IN ('short-term', 'long-term')) NOT NULL DEFAULT 'long-term',
  rent_amount NUMERIC(10, 2) NOT NULL,
  rent_frequency TEXT CHECK (rent_frequency IN ('monthly', 'weekly', 'biweekly', 'yearly')) NOT NULL DEFAULT 'monthly',
  security_deposit NUMERIC(10, 2) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Landlords can manage leases for their properties
CREATE POLICY "Landlords can view leases for their properties"
  ON public.leases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can insert leases for their properties"
  ON public.leases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update leases for their properties"
  ON public.leases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete leases for their properties"
  ON public.leases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_leases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION update_leases_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.leases IS 'Lease metadata (descriptive only, not legal documents). Supports lease history with multiple leases per property over time.';

