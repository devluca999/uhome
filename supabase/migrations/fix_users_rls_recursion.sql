-- Fix recursive RLS policy on users table
-- The admin policy queries public.users to check role, causing infinite recursion
-- Solution: Use a SECURITY DEFINER function to check admin role without RLS recursion
-- Run this in Supabase SQL Editor on STAGING database

-- Step 1: Create a helper function to check if current user is admin (bypasses RLS)
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

-- Step 2: Drop the problematic admin policy on users table
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Step 3: Recreate the admin policy using the helper function (no recursion)
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    -- Users can always read their own record (needed for fetchUserRole)
    id = auth.uid()
    OR
    -- Admins can read all users (using helper function to avoid recursion)
    public.is_admin_user()
  );

-- Step 4: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- Step 5: Add comment
COMMENT ON FUNCTION public.is_admin_user() IS 'Helper function to check if current user is admin. Uses SECURITY DEFINER to bypass RLS and avoid recursion when checking admin role in RLS policies.';
