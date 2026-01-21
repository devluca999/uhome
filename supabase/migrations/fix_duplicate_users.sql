-- Fix duplicate user entries
-- Run this in Supabase SQL Editor on staging database
-- This will find and clean up duplicate user records

-- Step 1: Find all duplicate users with the same email
SELECT 
  email,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as user_ids,
  array_agg(role ORDER BY created_at) as roles,
  array_agg(created_at ORDER BY created_at) as created_dates
FROM public.users
WHERE email = 'getuhome01@gmail.com'
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 2: Keep the first (oldest) user record and delete duplicates
-- First, let's see what we have
SELECT id, email, role, created_at
FROM public.users
WHERE email = 'getuhome01@gmail.com'
ORDER BY created_at ASC;

-- Step 3: Delete duplicate user records, keeping only the oldest one
WITH duplicate_users AS (
  SELECT id, 
         email,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as rn
  FROM public.users
  WHERE email = 'getuhome01@gmail.com'
)
DELETE FROM public.users
WHERE id IN (
  SELECT id FROM duplicate_users WHERE rn > 1
);

-- Step 4: Verify only one user exists now
SELECT id, email, role, created_at
FROM public.users
WHERE email = 'getuhome01@gmail.com';

-- Step 5: Ensure the remaining user has admin role
UPDATE public.users
SET role = 'admin', updated_at = NOW()
WHERE email = 'getuhome01@gmail.com';

-- Step 6: Verify the admin user is ready
SELECT 
  u.id,
  u.email,
  u.role,
  u.created_at,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  'Admin user ready' as status
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'getuhome01@gmail.com';
