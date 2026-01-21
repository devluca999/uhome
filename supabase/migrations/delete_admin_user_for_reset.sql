-- Delete admin user to allow fresh signup
-- Run this in Supabase SQL Editor on STAGING database
-- This deletes the user from both auth.users and public.users
-- Then you can sign up fresh through the app

-- Step 1: Check current state
SELECT '=== Current State ===' as info;

SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE LOWER(au.email) = LOWER('getuhome01@gmail.com');

-- Step 2: Delete from public.users first (to avoid foreign key issues)
DELETE FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');

-- Step 3: Delete from auth.users
DELETE FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');

-- Step 4: Verify deletion
SELECT '=== After Deletion ===' as info;

SELECT 
  'auth.users' as source,
  COUNT(*) as count
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');

SELECT 
  'public.users' as source,
  COUNT(*) as count
FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');

-- Step 5: Show next steps
SELECT '=== Next Steps ===' as info,
  '1. Go to http://localhost:1000/signup' as step1,
  '2. Sign up with email: getuhome01@gmail.com and password: getuhome01#' as step2,
  '3. After signup, run set_admin_role_after_signup.sql to set admin role' as step3;
