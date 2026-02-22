-- RLS Policy Coverage Audit Script
-- Run this to verify all tables have RLS enabled and policies exist
-- Run this in Supabase SQL Editor

-- ============================================================================
-- CHECK RLS ENABLEMENT
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- ============================================================================
-- CHECK RLS POLICIES PER TABLE
-- ============================================================================

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
ORDER BY tablename, policyname;

-- ============================================================================
-- TABLES THAT SHOULD HAVE RLS ENABLED
-- ============================================================================

-- Core tables
-- users, organizations, memberships, subscriptions
-- properties, households, tenants
-- maintenance_requests (work orders)
-- documents
-- rent_records
-- messages
-- notifications
-- tenant_invites
-- tasks
-- leases
-- rate_limit_tracking
-- abuse_events

-- ============================================================================
-- VERIFY CRITICAL POLICIES EXIST
-- ============================================================================

-- Check for property access policies
SELECT 
  'Properties' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'properties';

-- Check for work order (maintenance_requests) policies
SELECT 
  'Maintenance Requests' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'maintenance_requests';

-- Check for message policies
SELECT 
  'Messages' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'messages';

-- Check for document policies
SELECT 
  'Documents' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'documents';

-- Check for tenant invite policies
SELECT 
  'Tenant Invites' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_invites';

-- ============================================================================
-- VERIFY TENANT ACCESS POLICIES
-- ============================================================================

-- Tenants should only see properties they're assigned to
-- This is verified by checking that property SELECT policies check tenant assignment

-- ============================================================================
-- VERIFY LANDLORD ACCESS POLICIES
-- ============================================================================

-- Landlords should only see properties they own or are members of
-- This is verified by checking that property SELECT policies check ownership/membership

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

-- Generate summary
WITH table_list AS (
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
),
policy_counts AS (
  SELECT 
    tablename,
    COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
),
rls_status AS (
  SELECT 
    tablename,
    rowsecurity as rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
)
SELECT 
  t.tablename,
  COALESCE(r.rls_enabled, false) as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count,
  CASE 
    WHEN COALESCE(r.rls_enabled, false) = false THEN '❌ RLS NOT ENABLED'
    WHEN COALESCE(p.policy_count, 0) = 0 THEN '⚠️ NO POLICIES'
    ELSE '✅ OK'
  END as status
FROM table_list t
LEFT JOIN rls_status r ON t.tablename = r.tablename
LEFT JOIN policy_counts p ON t.tablename = p.tablename
ORDER BY t.tablename;

