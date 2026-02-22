-- Add recurring expenses support to expenses table
-- Run this in Supabase SQL Editor

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS recurring_start_date DATE,
ADD COLUMN IF NOT EXISTS recurring_end_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.expenses.is_recurring IS 'Whether this expense recurs on a schedule';
COMMENT ON COLUMN public.expenses.recurring_frequency IS 'Frequency of recurrence: monthly, quarterly, or yearly';
COMMENT ON COLUMN public.expenses.recurring_start_date IS 'Date when recurring expense starts';
COMMENT ON COLUMN public.expenses.recurring_end_date IS 'Optional date when recurring expense ends (NULL means ongoing)';

