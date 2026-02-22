-- Add 'admin' to users.role CHECK constraint
-- Run this in Supabase SQL Editor
-- IMPORTANT: This extends the existing role enum to include 'admin' without breaking existing constraints
-- The admin role is set manually in the database (no UI for self-assignment)

-- Drop existing constraint if it exists (constraint names may vary)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check1;

-- Add new constraint with 'admin' role included
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('landlord', 'tenant', 'admin'));

-- Add comment for documentation
COMMENT ON COLUMN public.users.role IS 'User role: landlord, tenant, or admin. Admin role is set manually in database.';
