-- Extend notes table to support unit, work_order, and document entity types
-- Run this in Supabase SQL Editor

-- Drop existing constraint
ALTER TABLE public.notes 
DROP CONSTRAINT IF EXISTS notes_entity_type_check;

-- Add new constraint with all entity types
ALTER TABLE public.notes
ADD CONSTRAINT notes_entity_type_check 
CHECK (entity_type IN ('property', 'unit', 'tenant', 'rent_record', 'expense', 'work_order', 'document'));

-- Update comment
COMMENT ON TABLE public.notes IS 'Polymorphic notes system. Notes can be attached to properties, units, tenants, rent records, expenses, work orders, or documents. Markdown formatting supported.';

