-- Update rent_records payment method fields
-- Migrates from single payment_method enum to payment_method_type + payment_method_label
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns
ALTER TABLE public.rent_records
ADD COLUMN IF NOT EXISTS payment_method_type TEXT CHECK (payment_method_type IN ('manual', 'external')) NULL,
ADD COLUMN IF NOT EXISTS payment_method_label TEXT NULL;

-- Step 2: Migrate existing data
-- Convert existing 'manual'/'external' values to payment_method_type
UPDATE public.rent_records
SET payment_method_type = CASE 
  WHEN payment_method = 'manual' THEN 'manual'
  WHEN payment_method = 'external' THEN 'external'
  ELSE NULL
END
WHERE payment_method IS NOT NULL;

-- Step 3: Drop old constraint and column (after data migration)
ALTER TABLE public.rent_records
DROP CONSTRAINT IF EXISTS rent_records_payment_method_check;

-- Note: We keep the old column temporarily for backward compatibility
-- Remove it in a future migration once all code is updated
-- ALTER TABLE public.rent_records DROP COLUMN IF EXISTS payment_method;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.rent_records.payment_method_type IS 'Payment method category: manual (logged manually) or external (paid outside system)';
COMMENT ON COLUMN public.rent_records.payment_method_label IS 'Payment method label for external payments (e.g., Zelle, Cash, Check, Venmo, Bank Transfer). Only used when payment_method_type is external.';

