-- Diagnose email conflict issue
-- Run this in Supabase SQL Editor on STAGING database
-- This checks for duplicates in both auth.users and public.users

-- Check for duplicates in auth.users (this is likely where the conflict is)
SELECT 
  email,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as user_ids,
  array_agg(email_confirmed_at::text ORDER BY created_at) as confirmation_dates,
  array_agg(created_at::text ORDER BY created_at) as created_dates
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
GROUP BY email
HAVING COUNT(*) > 0;

-- Check for duplicates in public.users
SELECT 
  email,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as user_ids,
  array_agg(role ORDER BY created_at) as roles
FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
GROUP BY email
HAVING COUNT(*) > 0;

-- Check all users with this email (both tables)
SELECT 'auth.users' as table_name, id, email, email_confirmed_at, created_at
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
UNION ALL
SELECT 'public.users' as table_name, id, email, NULL::timestamp as email_confirmed_at, created_at
FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com')
ORDER BY created_at;

-- Check if IDs match between auth.users and public.users
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  pu.id as public_user_id,
  pu.email as public_email,
  pu.role,
  CASE 
    WHEN au.id = pu.id THEN 'IDs match'
    ELSE 'IDs DO NOT MATCH - THIS IS THE PROBLEM'
  END as status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE LOWER(au.email) = LOWER('getuhome01@gmail.com') 
   OR LOWER(pu.email) = LOWER('getuhome01@gmail.com');

-- Check for the users_email_partial_key constraint/index
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'auth'
  AND tablename = 'users'
  AND indexname LIKE '%email%'
ORDER BY indexname;
