-- Consolidated migration: Property and tenant field additions
-- Columns: household_id (tenants), tenant phone/notes, rent_record fields, property fields, expense recurring

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_household_id ON public.tenants(household_id) WHERE household_id IS NOT NULL;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT NULL;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS notes TEXT NULL;

ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('manual', 'external')) NULL;
ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL;
ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS late_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL;

ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS payment_method_type TEXT CHECK (payment_method_type IN ('manual', 'external')) NULL;
ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS payment_method_label TEXT NULL;
UPDATE public.rent_records SET payment_method_type = CASE WHEN payment_method = 'manual' THEN 'manual' WHEN payment_method = 'external' THEN 'external' ELSE NULL END WHERE payment_method IS NOT NULL AND payment_method_type IS NULL;
ALTER TABLE public.rent_records DROP CONSTRAINT IF EXISTS rent_records_payment_method_check;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS late_fee_rules JSONB;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rules_visible_to_tenants BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);
COMMENT ON COLUMN public.properties.is_active IS 'Whether the property is active. Inactive properties are excluded from calculations, metrics, and most views. Defaults to true.';

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly'));
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_start_date DATE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_end_date DATE;

NOTIFY pgrst, 'reload schema';
