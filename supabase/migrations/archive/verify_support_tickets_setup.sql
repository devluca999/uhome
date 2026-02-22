-- Verify support_tickets table exists and RLS is enabled
-- Run this in Supabase SQL Editor on STAGING database

-- Check if table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'support_tickets'
    ) THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist - Run create_support_tickets_table.sql'
  END as table_status;

-- Check if RLS is enabled
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE schemaname = 'public' 
      AND tablename = 'support_tickets'
      AND c.relrowsecurity = true
    ) THEN '✅ RLS is enabled'
    ELSE '❌ RLS is NOT enabled'
  END as rls_status;

-- Check if RLS policies exist
SELECT 
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ RLS policies exist'
    ELSE '❌ RLS policies missing - Run create_admin_rls_policies.sql'
  END as policy_status
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'support_tickets';

-- Show table structure if it exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'support_tickets'
ORDER BY ordinal_position;
