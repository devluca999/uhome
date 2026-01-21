-- Fix signup trigger - more robust version
-- Run this in Supabase SQL Editor
-- This version is more defensive and should handle any edge cases

-- Step 1: Ensure admin role constraint exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check1;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('landlord', 'tenant', 'admin'));

-- Step 2: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Create a more robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role TEXT := 'tenant';
BEGIN
  -- Only insert if the user doesn't already exist in public.users
  -- This prevents conflicts
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.users (id, email, role, created_at, updated_at)
    VALUES (NEW.id, NEW.email, default_role, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- If user already exists, just update the email
    UPDATE public.users
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING '[handle_new_user] Error creating user record for %: %', NEW.email, SQLERRM;
    -- Still return NEW so auth signup succeeds even if our trigger has issues
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Ensure RLS policies allow users to insert their own record
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Step 6: Verify the function and trigger exist
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'handle_new_user';

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
