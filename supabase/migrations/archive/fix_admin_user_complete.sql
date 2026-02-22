-- Complete fix for admin user getuhome01@gmail.com
-- Run this in Supabase SQL Editor on STAGING database
-- This handles the users_email_partial_key constraint issue

-- Step 1: Check current state
SELECT '=== Current State ===' as info;

-- Check auth.users
SELECT 
  'auth.users' as source,
  id,
  email,
  is_sso_user,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
ORDER BY created_at;

-- Check public.users
SELECT 
  'public.users' as source,
  id,
  email,
  role,
  created_at
FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
ORDER BY created_at;

-- Step 2: Ensure admin role constraint exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check1;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('landlord', 'tenant', 'admin'));

-- Step 3: Handle the user in auth.users
-- Scenario A: User exists and is NOT SSO - use it
-- Scenario B: User exists and IS SSO - we can't use it for password auth, need to fix
-- Scenario C: Multiple users exist - keep oldest non-SSO one

-- First, find the primary user (oldest non-SSO, or oldest if all are SSO)
WITH primary_user AS (
  SELECT 
    id,
    email,
    is_sso_user,
    created_at,
    email_confirmed_at,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE WHEN is_sso_user = false THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
)
SELECT 
  id,
  email,
  is_sso_user,
  created_at,
  email_confirmed_at,
  CASE WHEN rn = 1 THEN 'KEEP' ELSE 'DELETE' END as action
FROM primary_user;

-- Step 4: Ensure we have ONE non-SSO user (if none exists, we can't create via SQL easily)
-- For now, if user exists in auth.users, ensure public.users matches and has admin role
DO $$
DECLARE
  primary_user_id UUID;
  primary_user_email TEXT;
  primary_is_sso BOOLEAN;
BEGIN
  -- Find the primary user (prefer non-SSO, oldest)
  SELECT id, email, is_sso_user
  INTO primary_user_id, primary_user_email, primary_is_sso
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  ORDER BY 
    CASE WHEN is_sso_user = false THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1;

  IF primary_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user in auth.users: ID=%, Email=%, is_sso_user=%', 
      primary_user_id, primary_user_email, primary_is_sso;
    
    -- Ensure public.users has matching record with admin role
    INSERT INTO public.users (id, email, role, created_at, updated_at)
    VALUES (primary_user_id, primary_user_email, 'admin', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', email = EXCLUDED.email, updated_at = NOW();
    
    RAISE NOTICE 'Set admin role for user: %', primary_user_email;
  ELSE
    RAISE NOTICE 'User does not exist in auth.users. Create via Supabase Dashboard or signup flow.';
  END IF;
END $$;

-- Step 5: Clean up any duplicate public.users records (keep only the one matching auth.users)
WITH auth_user_ids AS (
  SELECT id
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  ORDER BY 
    CASE WHEN is_sso_user = false THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1
),
public_users_to_keep AS (
  SELECT pu.id
  FROM public.users pu
  JOIN auth_user_ids au ON pu.id = au.id
  WHERE LOWER(pu.email) = LOWER('getuhome01@gmail.com')
)
DELETE FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  AND id NOT IN (SELECT id FROM public_users_to_keep);

-- Step 6: Final verification
SELECT '=== Final State ===' as info;

SELECT 
  au.id as auth_user_id,
  pu.id as public_user_id,
  au.email as auth_email,
  pu.email as public_email,
  pu.role as public_role,
  au.is_sso_user,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  CASE 
    WHEN au.id = pu.id AND pu.role = 'admin' THEN '✅ Ready - IDs match and admin role set'
    WHEN au.id = pu.id THEN '⚠️ IDs match but role is not admin'
    WHEN au.is_sso_user = true THEN '⚠️ User is SSO - cannot login with password'
    ELSE '❌ IDs do not match - Problem'
  END as status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE (LOWER(au.email) = LOWER('getuhome01@gmail.com'))
   OR LOWER(pu.email) = LOWER('getuhome01@gmail.com');
