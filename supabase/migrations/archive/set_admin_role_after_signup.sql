-- Set admin role for getuhome01@gmail.com after they sign up
-- Run this in Supabase SQL Editor on STAGING database
-- AFTER the user has signed up through the app

-- Step 1: Check if user exists
SELECT '=== Check User ===' as info;

SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  pu.role as current_role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE LOWER(au.email) = LOWER('getuhome01@gmail.com');

-- Step 2: Set admin role
UPDATE public.users
SET 
  role = 'admin',
  updated_at = NOW()
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');

-- Step 3: Verify admin role is set
SELECT '=== After Setting Admin Role ===' as info;

SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  pu.role,
  CASE 
    WHEN pu.role = 'admin' THEN '✅ Admin role set - Ready to login!'
    ELSE '❌ Role not set correctly'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE LOWER(au.email) = LOWER('getuhome01@gmail.com');
