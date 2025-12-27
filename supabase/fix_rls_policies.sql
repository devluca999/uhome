-- Fix RLS policies for users table to allow signup flow
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- Add INSERT policy to allow users to create their own record during signup
CREATE POLICY "Users can insert own data" 
  ON public.users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Recreate SELECT policy
CREATE POLICY "Users can read own data" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

-- Recreate UPDATE policy  
CREATE POLICY "Users can update own data" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- Update the trigger function to handle role from signup better
-- The trigger will still create the record, but our code will update it with the correct role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'tenant') -- Default role, will be updated by signup flow
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

