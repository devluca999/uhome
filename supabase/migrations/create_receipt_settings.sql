-- Create receipt_settings table for receipt customization
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  header_text TEXT NULL,
  logo_url TEXT NULL,
  footer_note TEXT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own receipt settings
CREATE POLICY "Users can view their own receipt settings"
  ON public.receipt_settings
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own receipt settings"
  ON public.receipt_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own receipt settings"
  ON public.receipt_settings
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_receipt_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipt_settings_updated_at
  BEFORE UPDATE ON public.receipt_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_receipt_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.receipt_settings IS 'Receipt customization settings per landlord (header, logo, footer, currency, date format)';

