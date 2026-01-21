-- Check email constraints and indexes
-- Run this in Supabase SQL Editor to diagnose the duplicate key issue

-- Check all unique constraints on users table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY conname;

-- Check all indexes on users table (including unique indexes)
SELECT 
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY indexname;

-- Check specifically for the users_email_partial_key constraint/index
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND indexname LIKE '%email%'
ORDER BY indexname;

-- Check if there are any users with the same email (case-insensitive check)
SELECT 
  LOWER(email) as email_lower,
  COUNT(*) as count,
  array_agg(id) as user_ids,
  array_agg(email) as emails
FROM public.users
WHERE email IS NOT NULL
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- Check for the specific user
SELECT 
  id,
  email,
  LOWER(email) as email_lower,
  role,
  created_at
FROM public.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');

-- Check in auth.users too
SELECT 
  id,
  email,
  LOWER(email) as email_lower,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');
