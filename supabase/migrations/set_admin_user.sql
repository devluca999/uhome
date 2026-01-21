-- Create admin user: getuhome01@gmail.com
-- Run this in Supabase SQL Editor
-- IMPORTANT: 
-- 1. Make sure you've run add_admin_role.sql first to add 'admin' to the role constraint
-- 2. This creates/updates a user with admin role
-- Password: getuhome01#
--
-- NOTE: Direct password setting in auth.users via SQL doesn't work well with Supabase Auth.
-- The recommended approach is to:
-- Option A: Sign up through the app first, then run this script to set admin role
-- Option B: Use Supabase Dashboard > Authentication > Add User to create the user first

-- First, ensure the admin role constraint exists (in case add_admin_role.sql wasn't run)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check1;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('landlord', 'tenant', 'admin'));

-- Check if user exists in auth.users
DO $$
DECLARE
  existing_user_id UUID;
  user_email TEXT := 'getuhome01@gmail.com';
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = user_email;

  IF existing_user_id IS NOT NULL THEN
    -- User exists in auth.users, create/update in public.users with admin role
    INSERT INTO public.users (id, email, role)
    VALUES (existing_user_id, user_email, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', email = user_email;

    RAISE NOTICE 'Admin role set for existing user: % (ID: %)', user_email, existing_user_id;
  ELSE
    RAISE NOTICE 'User does not exist in auth.users. Please create the user first using one of these methods:';
    RAISE NOTICE '1. Sign up through the app at /signup with email: % and password: getuhome01#', user_email;
    RAISE NOTICE '2. Use Supabase Dashboard > Authentication > Add User';
    RAISE NOTICE 'Then run this script again to set the admin role.';
  END IF;
END $$;

-- Verify the admin user status
SELECT 
  u.id,
  u.email,
  u.role,
  u.created_at,
  au.id IS NOT NULL as exists_in_auth,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  CASE 
    WHEN au.id IS NULL THEN 'User needs to be created in auth.users first'
    WHEN u.role = 'admin' THEN 'Admin user is ready'
    ELSE 'User exists but needs admin role'
  END as status
FROM public.users u
FULL OUTER JOIN auth.users au ON u.id = au.id
WHERE u.email = 'getuhome01@gmail.com' OR au.email = 'getuhome01@gmail.com';
