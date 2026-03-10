-- Extend expenses table with property-level metadata for scheduling and status
-- This migration is additive and backwards-compatible with existing data and code.
-- It does NOT change existing canonical columns (expense_date, description, is_recurring, recurring_frequency, etc.).

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS recurring_type TEXT,
ADD COLUMN IF NOT EXISTS recurring_interval INTEGER,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS next_due_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS title TEXT;

-- Optional documentation comments (non-breaking)
COMMENT ON COLUMN public.expenses.type IS 'High-level type of expense: one_time or recurring';
COMMENT ON COLUMN public.expenses.recurring_type IS 'Recurring cadence: monthly, quarterly, yearly (UI-level helper, distinct from recurring_frequency used in analytics)';
COMMENT ON COLUMN public.expenses.recurring_interval IS 'Numeric interval used for custom recurrence rules (e.g. every N days). Zero / NULL means use recurring_type defaults.';
COMMENT ON COLUMN public.expenses.start_date IS 'Logical start date for the expense or series (for scheduling widgets)';
COMMENT ON COLUMN public.expenses.end_date IS 'Logical end date for the expense or series (for scheduling widgets)';
COMMENT ON COLUMN public.expenses.next_due_date IS 'Next due date for this expense or series (drives Upcoming Expenses widgets)';
COMMENT ON COLUMN public.expenses.status IS 'Lightweight status field: planned, due, paid, canceled';
COMMENT ON COLUMN public.expenses.notes IS 'Freeform notes for landlords about this expense';
COMMENT ON COLUMN public.expenses.title IS 'Optional display title; UI may also use description/name.';

