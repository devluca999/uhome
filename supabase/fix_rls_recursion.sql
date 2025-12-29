-- Fix RLS Recursion Issues
-- This addresses circular dependencies in RLS policies that cause 500 errors
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PROBLEM: Policies have circular dependencies
-- properties -> tenants -> properties (causes recursion/500 errors)
-- ============================================================================

-- SOLUTION: Use helper functions with SECURITY DEFINER to break recursion
-- These functions bypass RLS for internal checks, preventing infinite loops

-- Function to check if user owns a property (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_owns_property(property_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_uuid AND owner_id = auth.uid()
  );
END;
$$;

-- Function to check if user is tenant of a property (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_tenant_of_property(property_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenants
    WHERE property_id = property_uuid AND user_id = auth.uid()
  );
END;
$$;

-- Function to check if user can access property (either owner or tenant)
CREATE OR REPLACE FUNCTION public.user_can_access_property(property_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.user_owns_property(property_uuid) OR 
         public.user_is_tenant_of_property(property_uuid);
END;
$$;

-- ============================================================================
-- DROP AND RECREATE POLICIES WITH NON-RECURSIVE CHECKS
-- ============================================================================

-- Drop existing policies that have recursion issues
DROP POLICY IF EXISTS "Landlords can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can view tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can view requests for own properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Landlords and tenants can view documents for their properties" ON public.documents;
DROP POLICY IF EXISTS "Landlords can view rent records for own properties" ON public.rent_records;

-- PROPERTIES: Use direct check instead of subquery to tenants
CREATE POLICY "Landlords can view own properties" 
  ON public.properties FOR SELECT 
  USING (owner_id = auth.uid() OR public.user_is_tenant_of_property(id));

-- TENANTS: Use helper function to avoid recursion
CREATE POLICY "Landlords can view tenants in own properties" 
  ON public.tenants FOR SELECT 
  USING (
    public.user_owns_property(property_id) OR
    user_id = auth.uid()
  );

-- MAINTENANCE_REQUESTS: Use helper functions
CREATE POLICY "Landlords can view requests for own properties" 
  ON public.maintenance_requests FOR SELECT 
  USING (
    public.user_owns_property(property_id) OR
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

-- DOCUMENTS: Use helper function
CREATE POLICY "Landlords and tenants can view documents for their properties" 
  ON public.documents FOR SELECT 
  USING (public.user_can_access_property(property_id));

-- RENT_RECORDS: Use helper function
CREATE POLICY "Landlords can view rent records for own properties" 
  ON public.rent_records FOR SELECT 
  USING (
    public.user_owns_property(property_id) OR
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- ALSO FIX INSERT/UPDATE/DELETE POLICIES THAT MIGHT HAVE RECURSION
-- ============================================================================

-- TENANTS: Fix INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Landlords can create tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can update tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can delete tenants in own properties" ON public.tenants;

CREATE POLICY "Landlords can create tenants in own properties" 
  ON public.tenants FOR INSERT 
  WITH CHECK (public.user_owns_property(property_id));

CREATE POLICY "Landlords can update tenants in own properties" 
  ON public.tenants FOR UPDATE 
  USING (public.user_owns_property(property_id));

CREATE POLICY "Landlords can delete tenants in own properties" 
  ON public.tenants FOR DELETE 
  USING (public.user_owns_property(property_id));

-- MAINTENANCE_REQUESTS: Fix UPDATE policy
DROP POLICY IF EXISTS "Landlords can update requests for own properties" ON public.maintenance_requests;
CREATE POLICY "Landlords can update requests for own properties" 
  ON public.maintenance_requests FOR UPDATE 
  USING (public.user_owns_property(property_id));

-- DOCUMENTS: Fix INSERT/DELETE policies
DROP POLICY IF EXISTS "Landlords can upload documents to own properties" ON public.documents;
DROP POLICY IF EXISTS "Landlords can delete documents from own properties" ON public.documents;

CREATE POLICY "Landlords can upload documents to own properties" 
  ON public.documents FOR INSERT 
  WITH CHECK (
    public.user_owns_property(property_id) AND
    uploaded_by = auth.uid()
  );

CREATE POLICY "Landlords can delete documents from own properties" 
  ON public.documents FOR DELETE 
  USING (public.user_owns_property(property_id));

-- RENT_RECORDS: Fix INSERT/UPDATE policies
DROP POLICY IF EXISTS "Landlords can create rent records for own properties" ON public.rent_records;
DROP POLICY IF EXISTS "Landlords can update rent records for own properties" ON public.rent_records;

CREATE POLICY "Landlords can create rent records for own properties" 
  ON public.rent_records FOR INSERT 
  WITH CHECK (public.user_owns_property(property_id));

CREATE POLICY "Landlords can update rent records for own properties" 
  ON public.rent_records FOR UPDATE 
  USING (public.user_owns_property(property_id));

