-- Update RLS policies for properties and tenants to use organization-based access
-- Run this in Supabase SQL Editor
-- Note: These policies work alongside existing owner_id-based policies during migration

-- ============================================================================
-- PROPERTIES RLS POLICIES (Updated for Organizations)
-- ============================================================================

-- Drop existing policies (we'll recreate them with organization support)
DROP POLICY IF EXISTS "Landlords can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can create own properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can delete own properties" ON public.properties;

-- Landlords can view properties in their organizations (owner or collaborator)
-- Also allow access via owner_id for backward compatibility during migration
CREATE POLICY "Landlords can view properties in their organizations"
  ON public.properties FOR SELECT
  USING (
    -- Organization-based access (new)
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'collaborator')
    )
    OR
    -- Backward compatibility: owner_id access (during migration)
    owner_id = auth.uid()
    OR
    -- Tenant access (via household -> property)
    id IN (
      SELECT h.property_id FROM public.households h
      JOIN public.tenants t ON t.household_id = h.id
      WHERE t.user_id = auth.uid()
    )
    OR
    -- Legacy tenant access (via direct property link during migration)
    id IN (
      SELECT property_id FROM public.tenants
      WHERE user_id = auth.uid()
    )
  );

-- Landlords can create properties in their organizations
CREATE POLICY "Landlords can create properties in their organizations"
  ON public.properties FOR INSERT
  WITH CHECK (
    -- Organization-based access (new)
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'collaborator')
    )
    OR
    -- Backward compatibility: owner_id access (during migration)
    owner_id = auth.uid()
  );

-- Landlords can update properties in their organizations
CREATE POLICY "Landlords can update properties in their organizations"
  ON public.properties FOR UPDATE
  USING (
    -- Organization-based access (new)
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'collaborator')
    )
    OR
    -- Backward compatibility: owner_id access (during migration)
    owner_id = auth.uid()
  );

-- Landlords can delete properties in their organizations
-- Note: Only owners should delete, but we allow collaborators for now (can restrict later)
CREATE POLICY "Landlords can delete properties in their organizations"
  ON public.properties FOR DELETE
  USING (
    -- Organization-based access (new)
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'collaborator')
    )
    OR
    -- Backward compatibility: owner_id access (during migration)
    owner_id = auth.uid()
  );

-- ============================================================================
-- TENANTS RLS POLICIES (Updated for Households)
-- ============================================================================

-- Drop existing policies (we'll recreate them with household support)
DROP POLICY IF EXISTS "Landlords can view tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can create tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can update tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can delete tenants in own properties" ON public.tenants;

-- Landlords can view tenants in their organization's properties
-- Also allow access via property owner_id for backward compatibility
CREATE POLICY "Landlords can view tenants in their properties"
  ON public.tenants FOR SELECT
  USING (
    -- Organization-based access via household -> property
    household_id IN (
      SELECT h.id FROM public.households h
      JOIN public.properties p ON p.id = h.property_id
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    -- Backward compatibility: direct property link
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    -- Legacy owner_id access
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
    OR
    -- Tenant can view their own tenant record
    user_id = auth.uid()
  );

-- Landlords can create tenants in their organization's properties
CREATE POLICY "Landlords can create tenants in their properties"
  ON public.tenants FOR INSERT
  WITH CHECK (
    -- Organization-based access via household -> property
    household_id IN (
      SELECT h.id FROM public.households h
      JOIN public.properties p ON p.id = h.property_id
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    -- Backward compatibility: direct property link
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    -- Legacy owner_id access
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Landlords can update tenants in their organization's properties
CREATE POLICY "Landlords can update tenants in their properties"
  ON public.tenants FOR UPDATE
  USING (
    -- Organization-based access via household -> property
    household_id IN (
      SELECT h.id FROM public.households h
      JOIN public.properties p ON p.id = h.property_id
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    -- Backward compatibility: direct property link
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    -- Legacy owner_id access
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Landlords can delete tenants in their organization's properties
CREATE POLICY "Landlords can delete tenants in their properties"
  ON public.tenants FOR DELETE
  USING (
    -- Organization-based access via household -> property
    household_id IN (
      SELECT h.id FROM public.households h
      JOIN public.properties p ON p.id = h.property_id
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    -- Backward compatibility: direct property link
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    -- Legacy owner_id access
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

