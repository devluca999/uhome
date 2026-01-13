-- Unified Database Schema (Final State)
-- This file shows the FINAL STATE of tables after all migrations
-- Use this as a reference to understand the complete schema
--
-- IMPORTANT: This file is for REFERENCE ONLY
-- For actual database setup:
-- 1. Run schema.sql first (creates base tables)
-- 2. Run migrations in order (see apply-all-migrations.sql)
--
-- This file shows the final state of key tables that differ from base schema.sql
-- Other tables (users, properties, tenants, etc.) are defined in schema.sql

-- ============================================================================
-- LEASES TABLE (Final State)
-- ============================================================================
-- Includes: status column, nullable tenant_id/lease_start_date/rent_amount
-- Original: create_leases_table.sql
-- Updates: add_lease_status_and_draft_support.sql

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- Nullable for drafts
  status TEXT CHECK (status IN ('draft', 'active', 'ended')) NOT NULL DEFAULT 'draft',
  lease_start_date DATE, -- Nullable for drafts
  lease_end_date DATE NULL,
  lease_type TEXT CHECK (lease_type IN ('short-term', 'long-term')) NOT NULL DEFAULT 'long-term',
  rent_amount NUMERIC(10, 2), -- Nullable for drafts
  rent_frequency TEXT CHECK (rent_frequency IN ('monthly', 'weekly', 'biweekly', 'yearly')) NOT NULL DEFAULT 'monthly',
  security_deposit NUMERIC(10, 2) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MAINTENANCE_REQUESTS TABLE (Final State)
-- ============================================================================
-- Includes: lease_id, created_by, created_by_role, scheduled_date, visibility_to_tenants,
--           internal_notes, public_description
-- Original: schema.sql (basic table)
-- Updates: make_work_order_tenant_optional.sql (adds created_by, makes tenant_id nullable)
--          refactor_work_order_status_system.sql (adds created_by_role, visibility, etc.)
--          add_lease_id_to_maintenance_requests.sql (adds lease_id, makes property_id/tenant_id nullable)

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE, -- Nullable (lease-scoped)
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- Nullable (lease-scoped)
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE, -- Lease-scoped
  status TEXT CHECK (status IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed')) NOT NULL DEFAULT 'submitted',
  category TEXT,
  description TEXT NOT NULL, -- Kept for backward compatibility
  public_description TEXT, -- Description visible to tenants
  internal_notes TEXT, -- Landlord-only notes
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE, -- Who created the work order
  created_by_role TEXT CHECK (created_by_role IN ('landlord', 'tenant')) NOT NULL, -- Role of creator
  scheduled_date TIMESTAMP WITH TIME ZONE, -- When maintenance is scheduled
  visibility_to_tenants BOOLEAN DEFAULT true, -- Whether visible to tenants
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TASKS TABLE (Final State)
-- ============================================================================
-- Source: create_tasks_table.sql

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

-- ============================================================================
-- INDEXES FOR UPDATED TABLES
-- ============================================================================

-- Leases indexes
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_status_tenant_id ON public.leases(status, tenant_id) WHERE tenant_id IS NOT NULL;

-- Maintenance requests indexes (additional to base schema)
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_lease_id ON public.maintenance_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by_role ON public.maintenance_requests(created_by_role);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_visibility ON public.maintenance_requests(visibility_to_tenants);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheduled_date ON public.maintenance_requests(scheduled_date);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON public.tasks(linked_context_type, linked_context_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline) WHERE deadline IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.leases.status IS 'Lease lifecycle status: draft (created via invite), active (tenant joined), ended (immutable, terminal)';
COMMENT ON COLUMN public.leases.tenant_id IS 'Nullable for draft leases. Set when tenant accepts invite.';

COMMENT ON COLUMN public.maintenance_requests.lease_id IS 'Lease-scoped maintenance request. Required for new requests. Property/tenant_id kept for backward compatibility.';
COMMENT ON COLUMN public.maintenance_requests.created_by_role IS 'Role of the user who created this work order. Determines valid status flow.';
COMMENT ON COLUMN public.maintenance_requests.scheduled_date IS 'When maintenance is scheduled to occur. Set when status transitions to scheduled.';
COMMENT ON COLUMN public.maintenance_requests.visibility_to_tenants IS 'Whether this work order is visible to tenants assigned to the property. Default true.';
COMMENT ON COLUMN public.maintenance_requests.internal_notes IS 'Landlord-only notes. Not visible to tenants.';
COMMENT ON COLUMN public.maintenance_requests.public_description IS 'Description visible to tenants. Replaces description field.';

COMMENT ON TABLE public.tasks IS 'Polymorphic tasks system. Tasks can be assigned to tenants/households/units and linked to work orders, move-ins, properties, or rent records. Supports checklists and image uploads.';

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This file shows the FINAL STATE of key tables after all migrations
-- 
-- For complete database setup:
-- 1. Run schema.sql (creates base tables: users, properties, tenants, etc.)
-- 2. Run migrations in order (see apply-all-migrations.sql)
--
-- Key differences from base schema.sql:
-- - leases: Added status column, made tenant_id/lease_start_date/rent_amount nullable
-- - maintenance_requests: Added lease_id, created_by, created_by_role, scheduled_date,
--   visibility_to_tenants, internal_notes, public_description
--   Changed status CHECK constraint to: ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed')
--   Made property_id and tenant_id nullable (lease-scoped)
-- - tasks: New table (doesn't exist in base schema.sql)
--
-- RLS policies, triggers, and functions are defined in migration files
-- See apply-all-migrations.sql for complete migration order
--

