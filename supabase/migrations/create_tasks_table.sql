-- Create tasks table for polymorphic tasks system
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  assigned_to_type TEXT CHECK (assigned_to_type IN ('tenant', 'household', 'unit')) NOT NULL,
  assigned_to_id UUID NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed')) NOT NULL DEFAULT 'pending',
  deadline DATE,
  linked_context_type TEXT CHECK (linked_context_type IN ('work_order', 'move_in', 'property', 'rent_record')) NOT NULL,
  linked_context_id UUID NOT NULL,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  image_urls JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Landlords can manage all tasks, tenants can view/update tasks assigned to them
CREATE POLICY "Landlords can view all tasks for their properties"
  ON public.tasks
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    (assigned_to_type = 'tenant' AND assigned_to_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )) OR
    (linked_context_type = 'property' AND linked_context_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )) OR
    (linked_context_type = 'work_order' AND linked_context_id IN (
      SELECT id FROM public.maintenance_requests WHERE property_id IN (
        SELECT id FROM public.properties WHERE owner_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Landlords can create tasks for their properties"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    (
      (linked_context_type = 'property' AND linked_context_id IN (
        SELECT id FROM public.properties WHERE owner_id = auth.uid()
      )) OR
      (linked_context_type = 'work_order' AND linked_context_id IN (
        SELECT id FROM public.maintenance_requests WHERE property_id IN (
          SELECT id FROM public.properties WHERE owner_id = auth.uid()
        )
      )) OR
      (linked_context_type = 'rent_record' AND linked_context_id IN (
        SELECT id FROM public.rent_records WHERE property_id IN (
          SELECT id FROM public.properties WHERE owner_id = auth.uid()
        )
      ))
    )
  );

CREATE POLICY "Landlords can update tasks for their properties"
  ON public.tasks
  FOR UPDATE
  USING (
    created_by = auth.uid() OR
    (linked_context_type = 'property' AND linked_context_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )) OR
    (linked_context_type = 'work_order' AND linked_context_id IN (
      SELECT id FROM public.maintenance_requests WHERE property_id IN (
        SELECT id FROM public.properties WHERE owner_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Tenants can update tasks assigned to them"
  ON public.tasks
  FOR UPDATE
  USING (
    assigned_to_type = 'tenant' AND assigned_to_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete tasks for their properties"
  ON public.tasks
  FOR DELETE
  USING (
    created_by = auth.uid() OR
    (linked_context_type = 'property' AND linked_context_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )) OR
    (linked_context_type = 'work_order' AND linked_context_id IN (
      SELECT id FROM public.maintenance_requests WHERE property_id IN (
        SELECT id FROM public.properties WHERE owner_id = auth.uid()
      )
    ))
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON public.tasks(linked_context_type, linked_context_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline) WHERE deadline IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE public.tasks IS 'Polymorphic tasks system. Tasks can be assigned to tenants/households/units and linked to work orders, move-ins, properties, or rent records. Supports checklists and image uploads.';

