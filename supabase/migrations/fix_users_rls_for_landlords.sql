-- Fix RLS policies for users table to allow landlords to read tenant emails
-- Run this in Supabase SQL Editor

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- Recreate SELECT policy that allows:
-- 1. Users to read their own data
-- 2. Landlords to read user emails for tenants in their properties
CREATE POLICY "Users can read own data" 
  ON public.users FOR SELECT 
  USING (
    auth.uid() = id OR
    -- Landlords can read user emails for tenants in their properties
    id IN (
      SELECT user_id FROM public.tenants 
      WHERE property_id IN (
        SELECT id FROM public.properties WHERE owner_id = auth.uid()
      )
    )
  );

