-- Fix email conflict for getuhome01@gmail.com
-- Run this in Supabase SQL Editor on STAGING database
-- This addresses the users_email_partial_key constraint violation

-- First, check what exists in auth.users
SELECT 
  id,
  email,
  is_sso_user,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
ORDER BY created_at;

-- Check what exists in public.users
SELECT 
  id,
  email,
  role,
  created_at
FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
ORDER BY created_at;

-- Find duplicates in auth.users (same email, is_sso_user = false)
-- Keep the oldest one, mark others as SSO or delete
WITH duplicate_users AS (
  SELECT 
    id,
    email,
    is_sso_user,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at ASC) as rn
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
)
SELECT 
  id,
  email,
  is_sso_user,
  created_at,
  rn,
  CASE 
    WHEN rn = 1 THEN 'KEEP - Oldest user'
    ELSE 'DELETE or MARK AS SSO - Duplicate'
  END as action
FROM duplicate_users
ORDER BY rn;

-- If there are duplicates, delete the newer ones (keeping the oldest)
-- WARNING: This will delete user records - make sure you want to do this!
-- First, let's identify which ones to delete
WITH duplicate_users AS (
  SELECT 
    id,
    email,
    is_sso_user,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at ASC) as rn
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
)
SELECT id, email, created_at, 'WILL DELETE' as action
FROM duplicate_users
WHERE rn > 1;

-- Actually delete duplicates (only run if you're sure!)
-- Uncomment the next block to execute:
/*
WITH duplicate_users AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at ASC) as rn
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
)
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM duplicate_users WHERE rn > 1
);
*/

-- Ensure public.users has matching record with admin role
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
ORDER BY au.created_at ASC
LIMIT 1
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', email = EXCLUDED.email, updated_at = NOW();

-- If multiple public.users records exist, keep only the one matching auth.users
-- First find which one matches
WITH auth_user AS (
  SELECT id, email
  FROM auth.users
  WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
    AND is_sso_user = false
  ORDER BY created_at ASC
  LIMIT 1
),
public_users_to_keep AS (
  SELECT pu.id
  FROM public.users pu
  JOIN auth_user au ON pu.id = au.id
  WHERE LOWER(pu.email) = LOWER('getuhome01@gmail.com')
)
DELETE FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
  AND id NOT IN (SELECT id FROM public_users_to_keep);

-- Final verification
SELECT 
  'auth.users' as table_name,
  au.id,
  au.email,
  au.is_sso_user,
  au.email_confirmed_at,
  au.created_at
FROM auth.users au
WHERE LOWER(au.email) = LOWER('getuhome01@gmail.com')
  AND au.is_sso_user = false
UNION ALL
SELECT 
  'public.users' as table_name,
  pu.id,
  pu.email,
  NULL as is_sso_user,
  NULL as email_confirmed_at,
  pu.created_at
FROM public.users pu
WHERE LOWER(pu.email) = LOWER('getuhome01@gmail.com')
ORDER BY created_at;

-- Verify IDs match
SELECT 
  au.id as auth_user_id,
  pu.id as public_user_id,
  au.email as auth_email,
  pu.email as public_email,
  pu.role,
  CASE 
    WHEN au.id = pu.id THEN '✅ IDs match - Ready to login'
    ELSE '❌ IDs do not match - Need to fix'
  END as status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE (LOWER(au.email) = LOWER('getuhome01@gmail.com') AND au.is_sso_user = false)
   OR LOWER(pu.email) = LOWER('getuhome01@gmail.com');
