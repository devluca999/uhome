-- Consolidated migration: Base tables and columns
-- Tables: tasks, notes, receipt_settings, user_property_types, property_groups, property_group_assignments
-- Columns: organization_id (properties), expense fields

-- Tasks table
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
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Landlords can view all tasks for their properties" ON public.tasks;
CREATE POLICY "Landlords can view all tasks for their properties" ON public.tasks FOR SELECT USING (
  created_by = auth.uid() OR
  (assigned_to_type = 'tenant' AND assigned_to_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())) OR
  (linked_context_type = 'property' AND linked_context_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())) OR
  (linked_context_type = 'work_order' AND linked_context_id IN (SELECT id FROM public.maintenance_requests WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())))
);
DROP POLICY IF EXISTS "Landlords can create tasks for their properties" ON public.tasks;
CREATE POLICY "Landlords can create tasks for their properties" ON public.tasks FOR INSERT WITH CHECK (
  created_by = auth.uid() AND (
    (linked_context_type = 'property' AND linked_context_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())) OR
    (linked_context_type = 'work_order' AND linked_context_id IN (SELECT id FROM public.maintenance_requests WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()))) OR
    (linked_context_type = 'rent_record' AND linked_context_id IN (SELECT id FROM public.rent_records WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())))
  )
);
DROP POLICY IF EXISTS "Landlords can update tasks for their properties" ON public.tasks;
CREATE POLICY "Landlords can update tasks for their properties" ON public.tasks FOR UPDATE USING (
  created_by = auth.uid() OR
  (linked_context_type = 'property' AND linked_context_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())) OR
  (linked_context_type = 'work_order' AND linked_context_id IN (SELECT id FROM public.maintenance_requests WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())))
);
DROP POLICY IF EXISTS "Tenants can update tasks assigned to them" ON public.tasks;
CREATE POLICY "Tenants can update tasks assigned to them" ON public.tasks FOR UPDATE USING (
  assigned_to_type = 'tenant' AND assigned_to_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Landlords can delete tasks for their properties" ON public.tasks;
CREATE POLICY "Landlords can delete tasks for their properties" ON public.tasks FOR DELETE USING (
  created_by = auth.uid() OR
  (linked_context_type = 'property' AND linked_context_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())) OR
  (linked_context_type = 'work_order' AND linked_context_id IN (SELECT id FROM public.maintenance_requests WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())))
);
CREATE OR REPLACE FUNCTION update_tasks_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON public.tasks(linked_context_type, linked_context_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline) WHERE deadline IS NOT NULL;

-- Notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type TEXT CHECK (entity_type IN ('property', 'tenant', 'rent_record', 'expense')) NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes" ON public.notes FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION update_notes_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION update_notes_updated_at();
CREATE INDEX IF NOT EXISTS idx_notes_entity ON public.notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);

-- Receipt settings table
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
ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own receipt settings" ON public.receipt_settings;
CREATE POLICY "Users can view their own receipt settings" ON public.receipt_settings FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own receipt settings" ON public.receipt_settings;
CREATE POLICY "Users can insert their own receipt settings" ON public.receipt_settings FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own receipt settings" ON public.receipt_settings;
CREATE POLICY "Users can update their own receipt settings" ON public.receipt_settings FOR UPDATE USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION update_receipt_settings_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS receipt_settings_updated_at ON public.receipt_settings;
CREATE TRIGGER receipt_settings_updated_at BEFORE UPDATE ON public.receipt_settings FOR EACH ROW EXECUTE FUNCTION update_receipt_settings_updated_at();

-- Property type system
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_type TEXT NULL;
CREATE TABLE IF NOT EXISTS public.user_property_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type_name)
);
ALTER TABLE public.user_property_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own property types" ON public.user_property_types;
CREATE POLICY "Users can view their own property types" ON public.user_property_types FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own property types" ON public.user_property_types;
CREATE POLICY "Users can insert their own property types" ON public.user_property_types FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own property types" ON public.user_property_types;
CREATE POLICY "Users can delete their own property types" ON public.user_property_types FOR DELETE USING (user_id = auth.uid());

-- Property groups
CREATE TABLE IF NOT EXISTS public.property_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('city', 'ownership', 'custom')) NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.property_group_assignments (
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.property_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, group_id)
);
ALTER TABLE public.property_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_group_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own property groups" ON public.property_groups;
CREATE POLICY "Users can view their own property groups" ON public.property_groups FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own property groups" ON public.property_groups;
CREATE POLICY "Users can insert their own property groups" ON public.property_groups FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own property groups" ON public.property_groups;
CREATE POLICY "Users can update their own property groups" ON public.property_groups FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own property groups" ON public.property_groups;
CREATE POLICY "Users can delete their own property groups" ON public.property_groups FOR DELETE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can view assignments for their properties" ON public.property_group_assignments;
CREATE POLICY "Users can view assignments for their properties" ON public.property_group_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_group_assignments.property_id AND properties.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert assignments for their properties" ON public.property_group_assignments;
CREATE POLICY "Users can insert assignments for their properties" ON public.property_group_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_group_assignments.property_id AND properties.owner_id = auth.uid()) AND
  EXISTS (SELECT 1 FROM public.property_groups WHERE property_groups.id = property_group_assignments.group_id AND property_groups.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can delete assignments for their properties" ON public.property_group_assignments;
CREATE POLICY "Users can delete assignments for their properties" ON public.property_group_assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_group_assignments.property_id AND properties.owner_id = auth.uid())
);

-- Organization_id and indexes (may already exist from initial_schema)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON public.properties(organization_id) WHERE organization_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
