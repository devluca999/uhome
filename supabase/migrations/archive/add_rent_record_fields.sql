-- Add fields to rent_records table for expandable ledger details
-- Run this in Supabase SQL Editor

ALTER TABLE public.rent_records
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('manual', 'external')) NULL,
ADD COLUMN IF NOT EXISTS notes TEXT NULL,
ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.rent_records.payment_method IS 'Payment method: manual (logged manually) or external (paid outside system)';
COMMENT ON COLUMN public.rent_records.notes IS 'Free-form notes about the payment';
COMMENT ON COLUMN public.rent_records.receipt_url IS 'URL to receipt or document if available';

