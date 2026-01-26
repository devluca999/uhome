-- Add unit_id to leases table (leases belong to units, not directly to properties)
-- This enforces the canonical model: Property → Unit → Lease → Tenants

-- Add unit_id column (nullable initially for migration)
ALTER TABLE public.leases ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE;

-- Migrate existing data: for each lease, find the unit that belongs to the same property
-- This assumes that if there are multiple units per property, we'll need to manually assign them
-- For now, we'll assign to the first unit found for each property
UPDATE public.leases
SET unit_id = (
  SELECT id FROM public.units
  WHERE units.property_id = leases.property_id
  LIMIT 1
)
WHERE unit_id IS NULL;

-- Make unit_id NOT NULL after migration
ALTER TABLE public.leases ALTER COLUMN unit_id SET NOT NULL;

-- Update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON public.leases(unit_id);

-- Update RLS policies to work with unit ownership
DROP POLICY IF EXISTS "Landlords can view leases for their properties" ON public.leases;
DROP POLICY IF EXISTS "Landlords can insert leases for their properties" ON public.leases;
DROP POLICY IF EXISTS "Landlords can update leases for their properties" ON public.leases;
DROP POLICY IF EXISTS "Landlords can delete leases for their properties" ON public.leases;

-- New policies based on unit ownership
CREATE POLICY "Landlords can view leases for their units"
  ON public.leases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.units
      JOIN public.properties ON properties.id = units.property_id
      WHERE units.id = leases.unit_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can insert leases for their units"
  ON public.leases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.units
      JOIN public.properties ON properties.id = units.property_id
      WHERE units.id = leases.unit_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update leases for their units"
  ON public.leases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.units
      JOIN public.properties ON properties.id = units.property_id
      WHERE units.id = leases.unit_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete leases for their units"
  ON public.leases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.units
      JOIN public.properties ON properties.id = units.property_id
      WHERE units.id = leases.unit_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Update tenant policies to work through units
DROP POLICY IF EXISTS "Tenants can view their leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can update their lease status" ON public.leases;

CREATE POLICY "Tenants can view leases for their units"
  ON public.leases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.lease_id = leases.id
      AND tenants.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can update their lease status"
  ON public.leases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.lease_id = leases.id
      AND tenants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.lease_id = leases.id
      AND tenants.user_id = auth.uid()
    )
  );

-- Update comment
COMMENT ON TABLE public.leases IS 'Lease metadata (descriptive only, not legal documents). Leases belong to units within properties. Supports lease history with multiple leases per unit over time.';