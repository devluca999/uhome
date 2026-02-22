-- Diagnose signup trigger issue
-- Run this in Supabase SQL Editor to check if trigger is set up correctly

-- Check if the function exists and its definition
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check if the trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as is_enabled,
  tgisinternal as is_internal
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Check RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- Check if RLS is enabled on users table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'users';
