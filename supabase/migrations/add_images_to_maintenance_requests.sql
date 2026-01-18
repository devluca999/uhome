-- Add image URLs support to maintenance requests
-- Run this in Supabase SQL Editor

-- Add image_urls column (JSONB array of image URLs)
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Add index for querying
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_image_urls ON public.maintenance_requests USING GIN (image_urls);

-- Add comment for documentation
COMMENT ON COLUMN public.maintenance_requests.image_urls IS 'Array of image URLs uploaded with the maintenance request. Stored as JSONB array of strings.';

