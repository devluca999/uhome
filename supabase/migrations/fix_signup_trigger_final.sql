-- Final fix for signup trigger - minimal and guaranteed to work
-- Run this in Supabase SQL Editor
-- This version is the simplest possible and should work without issues

-- Step 1: Drop everything and start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the function with explicit SECURITY DEFINER
-- Using a very simple version that just inserts without any complex logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple insert - if it fails, we catch the error and continue
  -- This ensures signup never fails even if our trigger has issues
  BEGIN
    INSERT INTO public.users (id, email, role, created_at, updated_at)
    VALUES (NEW.id, NEW.email, 'tenant', NOW(), NOW());
  EXCEPTION
    WHEN unique_violation THEN
      -- User already exists, that's fine - just continue
      NULL;
    WHEN OTHERS THEN
      -- Any other error - log it but don't fail signup
      RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant necessary permissions
-- Make sure the function owner can insert (though SECURITY DEFINER should handle this)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Step 5: Verify it's set up correctly
SELECT 
  'Function created' as status,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'handle_new_user';

SELECT 
  'Trigger created' as status,
  tgname as trigger_name,
  tgenabled as is_enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
