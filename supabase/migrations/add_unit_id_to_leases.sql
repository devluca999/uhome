-- Add unit_id to leases table (leases belong to units, not directly to properties)
-- This enforces the canonical model: Property → Unit → Lease → Tenants

-- Ensure units table exists first (create if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  rent_amount NUMERIC(10, 2),
  rent_due_date INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, unit_name)
);

-- Enable RLS if not already enabled
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Landlords can view units for their properties
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'units' AND policyname = 'Landlords can view units for their properties'
  ) THEN
    CREATE POLICY "Landlords can view units for their properties"
      ON public.units FOR SELECT
      USING (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()));
  END IF;
  
  -- Landlords can insert units for their properties
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'units' AND policyname = 'Landlords can insert units for their properties'
  ) THEN
    CREATE POLICY "Landlords can insert units for their properties"
      ON public.units FOR INSERT
      WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()));
  END IF;
  
  -- Landlords can update units for their properties
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'units' AND policyname = 'Landlords can update units for their properties'
  ) THEN
    CREATE POLICY "Landlords can update units for their properties"
      ON public.units FOR UPDATE
      USING (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()));
  END IF;
  
  -- Landlords can delete units for their properties
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'units' AND policyname = 'Landlords can delete units for their properties'
  ) THEN
    CREATE POLICY "Landlords can delete units for their properties"
      ON public.units FOR DELETE
      USING (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add unit_id column (nullable initially for migration, only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leases' 
    AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE public.leases ADD COLUMN unit_id UUID;
  END IF;
END $$;

-- Migrate existing data: for each lease, find or create a unit for the property
-- If no unit exists for a property, create a default one
DO $$
DECLARE
  lease_record RECORD;
  unit_id_val UUID;
BEGIN
  FOR lease_record IN SELECT id, property_id FROM public.leases WHERE unit_id IS NULL
  LOOP
    -- Try to find existing unit for this property
    SELECT id INTO unit_id_val
    FROM public.units
    WHERE property_id = lease_record.property_id
    LIMIT 1;
    
    -- If no unit exists, create a default one
    IF unit_id_val IS NULL THEN
      INSERT INTO public.units (property_id, unit_name, rent_amount, rent_due_date)
      VALUES (lease_record.property_id, 'Unit 1', NULL, NULL)
      RETURNING id INTO unit_id_val;
    END IF;
    
    -- Update lease with unit_id
    UPDATE public.leases
    SET unit_id = unit_id_val
    WHERE id = lease_record.id;
  END LOOP;
END $$;

-- Add foreign key constraint after all leases have unit_ids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leases_unit_id_fkey'
  ) THEN
    -- Only add constraint if all leases have unit_id
    IF NOT EXISTS (SELECT 1 FROM public.leases WHERE unit_id IS NULL) THEN
      ALTER TABLE public.leases 
      ADD CONSTRAINT leases_unit_id_fkey 
      FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;
    ELSE
      RAISE NOTICE 'Some leases still have NULL unit_id. Foreign key constraint not added yet.';
    END IF;
  END IF;
END $$;

-- Make unit_id NOT NULL after migration (only if all leases have unit_id)
DO $$
BEGIN
  -- Only set NOT NULL if all existing leases have unit_id
  IF NOT EXISTS (SELECT 1 FROM public.leases WHERE unit_id IS NULL) THEN
    ALTER TABLE public.leases ALTER COLUMN unit_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Some leases still have NULL unit_id. Please assign units to all leases before making this column NOT NULL.';
  END IF;
END $$;

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