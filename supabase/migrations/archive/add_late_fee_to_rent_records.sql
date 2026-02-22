-- Add late_fee field to rent_records table
-- MVP: Late fees are manually applied, not automated

ALTER TABLE public.rent_records
ADD COLUMN IF NOT EXISTS late_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.rent_records.late_fee IS 'Late fee amount (manually applied in MVP, no automation)';

