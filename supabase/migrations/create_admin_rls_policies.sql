-- Create admin-only RLS policies for system administration
-- Run this in Supabase SQL Editor
-- IMPORTANT: Admin access is granted via role check in RLS
-- This ensures non-admin users cannot access admin data even if frontend is bypassed
-- Pattern: All admin policies use public.is_admin_user() helper function to avoid RLS recursion
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- HELPER FUNCTION - Check if current user is admin (bypasses RLS recursion)
-- ============================================================================

-- Create helper function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- This function runs with SECURITY DEFINER, so it bypasses RLS
  -- It can safely query public.users without recursion
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

COMMENT ON FUNCTION public.is_admin_user() IS 'Helper function to check if current user is admin. Uses SECURITY DEFINER to bypass RLS and avoid recursion when checking admin role in RLS policies.';

-- ============================================================================
-- USERS TABLE - Admin can SELECT all users
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    -- Users can always read their own record (needed for fetchUserRole)
    id = auth.uid()
    OR
    -- Admins can read all users (using helper function to avoid recursion)
    public.is_admin_user()
  );

-- ============================================================================
-- SUBSCRIPTIONS TABLE - Admin can SELECT all subscriptions
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.is_admin_user());

-- ============================================================================
-- MESSAGES TABLE - Admin can SELECT all messages (read-only inspection)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (public.is_admin_user());

-- Note: Admin cannot INSERT, UPDATE, or DELETE messages (strictly read-only)

-- ============================================================================
-- SUPPORT_TICKETS TABLE - Admin can SELECT and UPDATE (mark resolved)
-- ============================================================================

-- Admin can view all support tickets
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;

CREATE POLICY "Admins can view all support tickets"
  ON public.support_tickets FOR SELECT
  USING (public.is_admin_user());

-- Admin can update support tickets (mark as resolved)
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;

CREATE POLICY "Admins can update support tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Users can create their own support tickets
DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;

CREATE POLICY "Users can create support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can view their own support tickets
DROP POLICY IF EXISTS "Users can view their own support tickets" ON public.support_tickets;

CREATE POLICY "Users can view their own support tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- ORGANIZATIONS TABLE - Admin can SELECT all organizations
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;

CREATE POLICY "Admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.is_admin_user());

-- ============================================================================
-- LEASES TABLE - Admin can SELECT all leases (for conversation context)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all leases" ON public.leases;

CREATE POLICY "Admins can view all leases"
  ON public.leases FOR SELECT
  USING (public.is_admin_user());

-- ============================================================================
-- PROPERTIES TABLE - Admin can SELECT all properties
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;

CREATE POLICY "Admins can view all properties"
  ON public.properties FOR SELECT
  USING (public.is_admin_user());

-- ============================================================================
-- TENANTS TABLE - Admin can SELECT all tenants
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all tenants" ON public.tenants;

CREATE POLICY "Admins can view all tenants"
  ON public.tenants FOR SELECT
  USING (public.is_admin_user());

-- ============================================================================
-- MEMBERSHIPS TABLE - Admin can SELECT all memberships
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all memberships" ON public.memberships;

CREATE POLICY "Admins can view all memberships"
  ON public.memberships FOR SELECT
  USING (public.is_admin_user());
