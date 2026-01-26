-- Apply All Migrations in Correct Order
-- Run this script on staging and production databases to bring them up to date
-- This script lists all migrations in dependency order
--
-- IMPORTANT: Supabase SQL Editor does not support \i (include) syntax
-- You must run each migration file manually in the order listed below
-- Copy the contents of each file and run them sequentially in Supabase SQL Editor
--
-- PREREQUISITES:
-- Ensure base schema.sql has been run first (creates base tables)
-- This script applies migrations that modify/add to the base schema

-- ============================================================================
-- STEP 1: BASE FEATURE MIGRATIONS (create new tables)
-- ============================================================================

-- 1.1: Create leases table (prerequisite for many other features)
-- FILE: create_leases_table.sql

-- 1.2: Create organizations, memberships, households, subscriptions
-- FILE: create_organizations_table.sql
-- FILE: create_memberships_table.sql
-- FILE: create_households_table.sql
-- FILE: create_subscriptions_table.sql

-- 1.3: Create messaging tables (requires leases)
-- FILE: create_messages_table.sql
-- FILE: create_notifications_table.sql

-- 1.4: Create other feature tables
-- FILE: create_tasks_table.sql
-- FILE: create_notes_table.sql
-- FILE: create_expenses_table.sql
-- FILE: create_tenant_invites_table.sql
-- FILE: create_units_table.sql
-- FILE: create_receipt_settings.sql

-- ============================================================================
-- STEP 2: ADD COLUMNS TO EXISTING TABLES
-- ============================================================================

-- 2.1: Add organization_id to properties
-- FILE: add_organization_to_properties.sql

-- 2.2: Add household_id to tenants
-- FILE: add_household_to_tenants.sql

-- 2.3: Add property type system
-- FILE: add_property_type_system.sql
-- FILE: add_property_groups.sql

-- 2.4: Add tenant fields
-- FILE: add_tenant_fields.sql

-- 2.5: Add rent record fields
-- FILE: add_rent_record_fields.sql
-- FILE: add_late_fee_to_rent_records.sql
-- FILE: add_payment_method_fields.sql

-- 2.6: Add property fields
-- FILE: add_late_fee_rules_to_properties.sql
-- FILE: add_house_rules_visibility.sql

-- 2.7: Add recurring expenses
-- FILE: add_recurring_expenses.sql

-- ============================================================================
-- STEP 3: LEASE STATUS AND DRAFT SUPPORT
-- ============================================================================

-- 3.1: Add status column and draft support to leases
-- FILE: add_lease_status_and_draft_support.sql

-- 3.2: Lease immutability and auto-end triggers
-- FILE: enforce_lease_immutability.sql
-- FILE: create_lease_auto_end_trigger.sql
-- FILE: prevent_ended_lease_updates.sql

-- ============================================================================
-- STEP 4: WORK ORDER STATUS REFACTORING
-- ============================================================================

-- 4.1: Make tenant optional and add created_by
-- FILE: make_work_order_tenant_optional.sql

-- 4.2: Refactor work order status system (adds created_by_role, visibility, etc.)
-- FILE: refactor_work_order_status_system.sql

-- 4.3: Migrate existing work order statuses
-- FILE: migrate_existing_work_order_statuses.sql

-- 4.4: Update RLS policies for status system
-- FILE: update_work_order_rls_for_status_system.sql

-- ============================================================================
-- STEP 5: LEASE NORMALIZATION (add lease_id to related tables)
-- ============================================================================

-- 5.1: Add lease_id to maintenance_requests
-- FILE: add_lease_id_to_maintenance_requests.sql

-- 5.2: Add lease_id to rent_records
-- FILE: add_lease_id_to_rent_records.sql

-- 5.3: Add lease_id to documents
-- FILE: add_lease_id_to_documents.sql

-- 5.4: Add lease_id to tenant_invites
-- FILE: add_lease_id_to_tenant_invites.sql

-- ============================================================================
-- STEP 6: MESSAGING SYSTEM SETUP
-- ============================================================================

-- 6.1: Create RLS policies for messages
-- FILE: create_messages_rls.sql

-- 6.2: Create RLS policies for notifications
-- FILE: create_notifications_rls.sql

-- 6.3: Create message triggers
-- FILE: create_message_triggers.sql

-- 6.4: Add unit_id to leases (leases belong to units, not properties)
-- FILE: add_unit_id_to_leases.sql

-- 6.5: Add message_type to messages (landlord_tenant vs household)
-- FILE: add_message_type_to_messages.sql

-- ============================================================================
-- STEP 7: ORGANIZATION HELPERS AND POLICIES
-- ============================================================================

-- 7.1: Create organization helper functions
-- FILE: create_organization_helpers.sql

-- 7.2: Create organization RLS policies
-- FILE: create_organization_rls_policies.sql

-- 7.3: Update properties and tenants RLS for organizations
-- FILE: update_properties_tenants_rls_for_organizations.sql

-- ============================================================================
-- STEP 8: RATE LIMITING AND ABUSE PREVENTION
-- ============================================================================

-- 8.1: Create rate limit tracking tables
-- FILE: add_rate_limit_tables.sql

-- 8.2: Add abuse guard triggers
-- FILE: add_abuse_guard_triggers.sql

-- 8.3: Enforce invite caps
-- FILE: enforce_invite_caps.sql

-- 8.4: Enforce upload limits
-- FILE: enforce_upload_limits.sql

-- ============================================================================
-- STEP 9: NOTIFICATION TRIGGERS
-- ============================================================================

-- 9.1: Add work order notifications
-- FILE: add_work_order_notifications.sql
-- FILE: create_work_order_notification_trigger.sql

-- ============================================================================
-- STEP 10: NOTES EXTENSIONS
-- ============================================================================

-- 10.1: Extend notes entity types
-- FILE: extend_notes_entity_types.sql

-- ============================================================================
-- STEP 11: FIXES AND UPDATES
-- ============================================================================

-- 11.1: Fix RLS recursion
-- FILE: fix_rls_recursion.sql

-- 11.2: Fix users RLS for landlords
-- FILE: fix_users_rls_for_landlords.sql

-- 11.3: Make tenants property_id nullable
-- FILE: make_tenants_property_id_nullable.sql

-- ============================================================================
-- STEP 12: VERIFICATION (OPTIONAL)
-- ============================================================================

-- 12.1: Verify RLS coverage
-- FILE: verify_rls_coverage.sql

-- ============================================================================
-- CRITICAL MIGRATIONS FOR STAGING DATABASE
-- ============================================================================
--
-- The following migrations are CRITICAL and must be run on staging:
--
-- 1. create_leases_table.sql
-- 2. add_lease_status_and_draft_support.sql (adds status column to leases)
-- 3. make_work_order_tenant_optional.sql (adds created_by column)
-- 4. refactor_work_order_status_system.sql (adds created_by_role, etc.)
-- 5. add_lease_id_to_maintenance_requests.sql (adds lease_id)
-- 6. create_tasks_table.sql
--
-- These are required for tests to work correctly with production schema.
--
-- ============================================================================
-- MIGRATION DEPENDENCIES
-- ============================================================================
--
-- - Leases table must exist before lease_id migrations (Step 5)
-- - Organizations must exist before organization_id migrations (Step 2.1)
-- - Maintenance requests status refactor (Step 4) must run before lease_id migration (Step 5.1)
-- - Work order tenant optional (Step 4.1) must run before status refactor (Step 4.2)
-- - Messages/notifications tables (Step 1.3) require leases table (Step 1.1)
--
-- ============================================================================
-- HOW TO RUN IN SUPABASE SQL EDITOR
-- ============================================================================
--
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. For each FILE listed above:
--    a. Open the migration file from supabase/migrations/
--    b. Copy its entire contents
--    c. Paste into SQL Editor
--    d. Click "Run" or press Ctrl+Enter
--    e. Wait for it to complete before proceeding to next file
-- 3. Run files in the exact order listed above
-- 4. Verify no errors occurred
--
-- ============================================================================
-- HOW TO RUN WITH PSQL (command line)
-- ============================================================================
--
-- From the project root directory:
-- psql $DATABASE_URL -f supabase/migrations/apply-all-migrations.sql
--
-- Note: You'll need to modify this script to use \i syntax for psql
-- or run each file individually: psql $DATABASE_URL -f supabase/migrations/create_leases_table.sql
--

