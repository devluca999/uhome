-- Check if user exists and set admin role
-- Run this in Supabase SQL Editor on staging database

-- First, ensure admin role constraint exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check1;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('landlord', 'tenant', 'admin'));

-- Check if the user exists in public.users
SELECT 
  id,
  email,
  role,
  created_at
FROM public.users
WHERE email = 'getuhome01@gmail.com';

-- Check if the user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'getuhome01@gmail.com';

-- If user exists in auth.users but not in public.users, create it
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'admin' as role,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'getuhome01@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  )
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', email = EXCLUDED.email, updated_at = NOW();

-- If user exists in both, just update role to admin
UPDATE public.users
SET role = 'admin', updated_at = NOW()
WHERE email = 'getuhome01@gmail.com';

-- Verify the admin user
SELECT 
  u.id,
  u.email,
  u.role,
  u.created_at,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  CASE 
    WHEN u.role = 'admin' THEN 'Admin user ready'
    ELSE 'Needs admin role'
  END as status
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'getuhome01@gmail.com' OR au.email = 'getuhome01@gmail.com';
