-- Fix duplicate non-SSO user issue for getuhome01@gmail.com
-- Run this in Supabase SQL Editor on STAGING database
-- The users_email_partial_key constraint requires exactly ONE non-SSO user per email

-- Step 1: Find ALL non-SSO users with this email
SELECT 
  '=== ALL non-SSO users with this email ===' as info;

SELECT 
  id,
  email,
  is_sso_user,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  AND is_sso_user = false
ORDER BY created_at;

-- Step 2: Count duplicates
SELECT 
  '=== Duplicate count ===' as info,
  COUNT(*) as duplicate_count
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  AND is_sso_user = false;

-- Step 3: Identify which one to keep (oldest with confirmed email, or oldest)
WITH ranked_users AS (
  SELECT 
    id,
    email,
    is_sso_user,
    email_confirmed_at,
    created_at,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE WHEN email_confirmed_at IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
)
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at,
  CASE WHEN rn = 1 THEN 'KEEP - Primary user' ELSE 'DELETE - Duplicate' END as action
FROM ranked_users
ORDER BY rn;

-- Step 4: Get the primary user ID (the one we'll keep)
WITH ranked_users AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE WHEN email_confirmed_at IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
)
SELECT id as primary_user_id
FROM ranked_users
WHERE rn = 1;

-- Step 5: Delete duplicates (keep only the primary user)
-- WARNING: This will delete user records - make sure you want to do this!
-- First, let's see what will be deleted:
WITH ranked_users AS (
  SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE WHEN email_confirmed_at IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  'WILL DELETE - Duplicate' as action
FROM ranked_users
WHERE rn > 1;

-- Actually delete duplicates (uncomment to execute):
/*
WITH ranked_users AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE WHEN email_confirmed_at IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
)
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM ranked_users WHERE rn > 1
);
*/

-- Step 6: Ensure public.users has the admin role for the primary user
DO $$
DECLARE
  primary_user_id UUID;
  primary_user_email TEXT;
BEGIN
  -- Get the primary user (oldest with confirmed email, or oldest)
  SELECT id, email
  INTO primary_user_id, primary_user_email
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
  ORDER BY 
    CASE WHEN email_confirmed_at IS NOT NULL THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1;

  IF primary_user_id IS NOT NULL THEN
    -- Ensure public.users has admin role
    INSERT INTO public.users (id, email, role, created_at, updated_at)
    VALUES (primary_user_id, primary_user_email, 'admin', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', email = EXCLUDED.email, updated_at = NOW();
    
    RAISE NOTICE 'Set admin role for primary user: % (ID: %)', primary_user_email, primary_user_id;
  ELSE
    RAISE NOTICE 'No non-SSO user found - cannot set admin role';
  END IF;
END $$;

-- Step 7: Clean up duplicate public.users records
WITH primary_auth_user AS (
  SELECT id
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
  ORDER BY 
    CASE WHEN email_confirmed_at IS NOT NULL THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1
)
DELETE FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  AND id NOT IN (SELECT id FROM primary_auth_user);

-- Step 8: Final verification
SELECT '=== FINAL STATE ===' as info;

SELECT 
  'auth.users' as source,
  COUNT(*) as count
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  AND is_sso_user = false;

SELECT 
  'public.users' as source,
  COUNT(*) as count
FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');

SELECT 
  au.id as auth_user_id,
  pu.id as public_user_id,
  au.email as auth_email,
  pu.email as public_email,
  pu.role as public_role,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  CASE 
    WHEN au.id = pu.id AND pu.role = 'admin' AND au.email_confirmed_at IS NOT NULL 
      THEN '✅ Ready - Can login with password or magic link'
    WHEN au.id = pu.id AND pu.role = 'admin' 
      THEN '⚠️ Ready but email not confirmed - may need to confirm email'
    WHEN au.id = pu.id 
      THEN '⚠️ IDs match but role is not admin'
    ELSE '❌ IDs do not match'
  END as status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE (LOWER(au.email) = LOWER('getuhome01@gmail.com') AND au.is_sso_user = false)
   OR LOWER(pu.email) = LOWER('getuhome01@gmail.com');
