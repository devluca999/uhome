-- Add late_fee_rules JSONB field to properties table
-- This allows structured storage of late fee rules (amount, grace_period_days, etc.)

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS late_fee_rules JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.late_fee_rules IS 'Structured late fee rules. Expected format: {"amount": number, "grace_period_days": number, "applies_after": "due_date" | "grace_period_end"}. Null if no late fee rules are configured.';

