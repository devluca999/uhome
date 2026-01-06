# Messaging System Migration Guide

## Overview

This guide covers the database migrations required for the MVP messaging system. These migrations create the `messages` and `notifications` tables, along with RLS policies and triggers.

## Prerequisites

**IMPORTANT**: The `leases` table must exist before running messaging migrations. If you haven't run it yet:

1. First run: `create_leases_table.sql` (creates the leases table)

This is required because `messages` and `notifications` tables have foreign key references to `leases`.

## Migration Files

Run these migrations in order on both **main** and **staging** databases:

1. `create_leases_table.sql` - **PREREQUISITE**: Creates the leases table (if not already created)
2. `create_messages_table.sql` - Creates the messages table
3. `create_notifications_table.sql` - Creates the notifications table
4. `create_messages_rls.sql` - RLS policies for messages table
5. `create_notifications_rls.sql` - RLS policies for notifications table
6. `create_message_triggers.sql` - Triggers and helper functions

## Running Migrations

### On Main Database

1. Open Supabase Dashboard → SQL Editor (your main project)
2. Run each migration file in order (copy/paste the contents)
3. Verify each migration completes successfully

### On Staging Database

1. Open Supabase Dashboard → SQL Editor (your staging project)
2. Run each migration file in the same order
3. Verify each migration completes successfully

## Execution Order

Run the migrations in this exact order:

```sql
-- 0. PREREQUISITE: Ensure leases table exists
-- Run: create_leases_table.sql (if not already run)

-- 1. Create messaging tables
-- Run: create_messages_table.sql
-- Run: create_notifications_table.sql

-- 2. Then RLS policies
-- Run: create_messages_rls.sql
-- Run: create_notifications_rls.sql

-- 3. Finally triggers and functions
-- Run: create_message_triggers.sql
```

**Note**: If you already have the `leases` table (check with `SELECT * FROM information_schema.tables WHERE table_name = 'leases'`), you can skip step 0.

## Verification

After running all migrations, verify they were created successfully:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('messages', 'notifications');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('messages', 'notifications');
-- Should show rowsecurity = true for both

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('messages');
-- Should show: create_notifications_on_message_insert

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'create_message_notifications',
  'is_lease_active',
  'create_system_message'
);
```

## Important Notes

- **Run on both databases**: Main and staging need identical schemas
- **Order matters**: Tables must be created before RLS policies and triggers
- **Idempotent**: Migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE`, so safe to re-run
- **No data migration needed**: These are new tables, no existing data to migrate

## Troubleshooting

### Migration Fails

If a migration fails:
1. Check the error message in Supabase SQL Editor
2. Common issues:
   - Missing dependencies (run migrations in order)
   - Permission issues (ensure you have admin access)
   - Syntax errors (check SQL syntax)
3. Fix the issue and re-run the migration

### RLS Policies Not Working

If RLS policies aren't working:
1. Verify RLS is enabled: `ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;`
2. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'messages';`
3. Verify user roles are correct in `users` table
4. Check lease relationships (tenant_id, property_id) are correct

### Triggers Not Firing

If triggers aren't creating notifications:
1. Verify trigger exists: Check `create_notifications_on_message_insert` trigger
2. Check function exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'create_message_notifications';`
3. Verify function has `SECURITY DEFINER` privilege
4. Test manually: Insert a test message and check if notification is created

