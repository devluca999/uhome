-- Extend notifications table to support property-scoped work order notifications

-- Add property_id column (nullable, for property-scoped notifications)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;

-- Add work_order_id column (nullable, references maintenance_requests)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE;

-- Make lease_id nullable (property-scoped notifications don't need lease)
ALTER TABLE public.notifications
  ALTER COLUMN lease_id DROP NOT NULL;

-- Update type CHECK constraint to include 'work_order'
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'system', 'work_order'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_property_id ON public.notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_work_order_id ON public.notifications(work_order_id);

-- Add comments
COMMENT ON COLUMN public.notifications.property_id IS 'Property ID for property-scoped notifications (e.g., work orders)';
COMMENT ON COLUMN public.notifications.work_order_id IS 'Work order ID for work order status change notifications';

