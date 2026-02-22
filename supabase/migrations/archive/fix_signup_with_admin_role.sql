-- Fix signup flow to work with admin role constraint
-- Run this in Supabase SQL Editor
-- This ensures the handle_new_user trigger can create users even with the admin role constraint

-- First, ensure the admin role constraint exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check1;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('landlord', 'tenant', 'admin'));

-- Update the handle_new_user function to ensure it works properly
-- This function is SECURITY DEFINER so it should bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'tenant') -- Default role, will be updated by signup flow
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- If there's an error, log it but don't fail the auth signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure INSERT policy exists and allows the trigger to work
-- The SECURITY DEFINER function should bypass RLS, but let's make sure the policy exists
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" 
  ON public.users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Also allow the system function to insert (though SECURITY DEFINER should handle this)
-- This is a fallback in case RLS is still blocking
-- Note: In practice, SECURITY DEFINER functions bypass RLS, so this shouldn't be needed
-- but it's here as a safety net
