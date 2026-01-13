-- Consolidate and optimize users table RLS policies
-- This fixes 500 errors and timeouts caused by conflicting policies
-- Run this in Supabase SQL Editor

-- Step 1: Drop all existing SELECT policies on users table
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can read related user emails" ON public.users;
DROP POLICY IF EXISTS "Users can read emails of users in same property" ON public.users;

-- Step 2: Create a single, optimized SELECT policy
-- This policy allows:
-- 1. Users to read their own data
-- 2. Landlords to read tenant data for their properties
-- 3. Tenants to read landlord data for their properties
-- 4. Users to read other users in shared contexts (same lease/property)
DROP POLICY IF EXISTS "Users can read accessible user data" ON public.users;
CREATE POLICY "Users can read accessible user data"
ON public.users
FOR SELECT
USING (
  -- Users can always read their own data
  id = auth.uid()
  OR
  -- Landlords can read users who are tenants in their properties
  EXISTS (
    SELECT 1 
    FROM tenants t
    JOIN properties p ON t.property_id = p.id
    WHERE t.user_id = users.id 
    AND p.owner_id = auth.uid()
  )
  OR
  -- Tenants can read their landlords (property owners)
  EXISTS (
    SELECT 1
    FROM tenants t
    JOIN properties p ON t.property_id = p.id
    WHERE t.user_id = auth.uid()
    AND p.owner_id = users.id
  )
  OR
  -- Tenants can read other tenants in the same property
  EXISTS (
    SELECT 1
    FROM tenants t1
    JOIN tenants t2 ON t1.property_id = t2.property_id
    WHERE t1.user_id = auth.uid()
    AND t2.user_id = users.id
  )
);

-- Step 3: Ensure UPDATE and INSERT policies exist
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Add comment for documentation
COMMENT ON POLICY "Users can read accessible user data" ON public.users IS 
'Optimized policy: users read their own data, landlords see tenant data, tenants see landlords and housemates. Replaces multiple conflicting policies that caused 500 errors.';

