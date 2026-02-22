-- Confirm admin user email and ensure ready for magic link auth
-- Run this in Supabase SQL Editor on STAGING database
-- This confirms the email and ensures the user can use magic links

-- Step 1: Check current state
SELECT '=== Current State ===' as info;

SELECT 
  au.id,
  au.email,
  au.is_sso_user,
  au.email_confirmed_at,
  au.created_at,
  pu.role as public_role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE LOWER(au.email) = LOWER('getuhome01@gmail.com')
  AND au.is_sso_user = false;

-- Step 2: Confirm the email (set email_confirmed_at to NOW if NULL)
-- This allows magic links to work with existing users
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  AND is_sso_user = false
  AND email_confirmed_at IS NULL;

-- Step 3: Ensure public.users has admin role
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'admin' as role,
  au.created_at,
  NOW()
FROM auth.users au
WHERE LOWER(au.email) = LOWER('getuhome01@gmail.com')
  AND au.is_sso_user = false
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  )
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', email = EXCLUDED.email, updated_at = NOW();

-- Step 4: Final verification
SELECT '=== Final State ===' as info;

SELECT 
  au.id,
  au.email,
  au.is_sso_user,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.email_confirmed_at,
  pu.role as public_role,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL AND pu.role = 'admin' 
      THEN '✅ Ready - Can use magic link or password login'
    WHEN au.email_confirmed_at IS NULL AND pu.role = 'admin'
      THEN '⚠️ Email not confirmed - magic link may fail'
    WHEN pu.role != 'admin'
      THEN '⚠️ Role is not admin'
    ELSE '❌ Issue'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE LOWER(au.email) = LOWER('getuhome01@gmail.com')
  AND au.is_sso_user = false;
