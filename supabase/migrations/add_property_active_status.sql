-- Add is_active column to properties table
-- Allows properties to be marked inactive without deletion
-- Inactive properties are excluded from calculations and metrics

-- Add is_active column (defaults to true for existing properties)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);

-- Add comment
COMMENT ON COLUMN public.properties.is_active IS 'Whether the property is active. Inactive properties are excluded from calculations, metrics, and most views. Defaults to true.';
