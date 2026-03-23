-- Migration: drop_environment_test_table
-- Applied: 2026-03-22
-- Drops the temporary debug table used for Supabase connectivity checks.
-- This table had RLS disabled and served no production purpose.

DROP TABLE IF EXISTS public.environment_test;
