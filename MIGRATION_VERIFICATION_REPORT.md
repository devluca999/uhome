# Migration Verification Report

## Overview
This report lists all migrations that should be applied to both staging and production databases based on the phased development plan.

## Migration Files by Phase

### Phase 1-2: Tenant UX & Messaging Entry Points
- ✅ No database migrations required (UI-only changes)

### Phase 3: Notifications & Messaging Infrastructure
- ✅ `add_email_notification_tables.sql` - Email delivery tracking and preferences
- ✅ `add_push_notification_tables.sql` - Push subscription tracking

### Phase 4: Payments (Stripe Connect)
- ✅ `add_stripe_tables.sql` - Stripe Connect accounts, payments, payment settings
- ✅ `add_late_fee_rules_to_properties.sql` - Late fee rules (may already exist)
- ✅ `add_payment_method_fields.sql` - Payment method fields (may already exist)

### Phase 5: Sys Admin / Internal Ops Console
- ✅ `add_admin_tables.sql` - Waitlist, promo_codes, newsletter_campaigns, leads

### Phase 6: Lead Scraper
- ✅ `add_scraper_tables.sql` - Scraper runs and kill switch

### Phase 7: Compliance & Documentation
- ✅ `add_compliance_tables.sql` - Data deletion/export requests, compliance audit log

### Phase 8: Sys Admin Release Version Control
- ✅ `add_release_tracking_tables.sql` - App releases, feature flags, release events

### Phase 10: Hybrid Lead Ingestion System
- ✅ `enhance_leads_table_phase10.sql` - Lead import events, field mappings, enhanced leads table

### Property Active Status (UI Enhancement)
- ✅ `add_property_active_status.sql` - Property is_active column

## Verification Steps

### 1. Check Migration Files Exist
All migration files listed above should exist in `supabase/migrations/`.

### 2. Verify in Supabase Dashboard

#### For Staging Database:
1. Open Supabase Dashboard → Staging Project
2. Navigate to SQL Editor
3. Check migration history or run:
```sql
-- Check if key tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'stripe_connect_accounts',
  'payments',
  'payment_settings',
  'waitlist',
  'promo_codes',
  'newsletter_campaigns',
  'leads',
  'email_deliveries',
  'email_preferences',
  'push_subscriptions',
  'scraper_runs',
  'scraper_kill_switch',
  'data_deletion_requests',
  'data_export_requests',
  'compliance_audit_log',
  'app_releases',
  'feature_flags',
  'release_events',
  'lead_import_events',
  'lead_field_mappings'
)
ORDER BY table_name;
```

#### For Production Database:
1. Open Supabase Dashboard → Production Project
2. Navigate to SQL Editor
3. Run the same query as above

### 3. Check Property is_active Column
```sql
-- Check if is_active column exists in properties table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'properties'
AND column_name = 'is_active';
```

### 4. Verify Column Counts Match
Run the verification script (requires environment variables):
```bash
# Set environment variables first:
# VITE_SUPABASE_URL (staging)
# SUPABASE_SERVICE_ROLE_KEY (staging)
# VITE_SUPABASE_URL_PROD (production)
# SUPABASE_SERVICE_ROLE_KEY_PROD (production)

npx tsx scripts/verify-schema-congruence.ts
```

## Expected Results

### All Tables Should Exist in Both Environments:
- ✅ `stripe_connect_accounts`
- ✅ `payments`
- ✅ `payment_settings`
- ✅ `waitlist`
- ✅ `promo_codes`
- ✅ `newsletter_campaigns`
- ✅ `leads` (with Phase 10 enhancements)
- ✅ `email_deliveries`
- ✅ `email_preferences`
- ✅ `push_subscriptions`
- ✅ `scraper_runs`
- ✅ `scraper_kill_switch`
- ✅ `data_deletion_requests`
- ✅ `data_export_requests`
- ✅ `compliance_audit_log`
- ✅ `app_releases`
- ✅ `feature_flags`
- ✅ `release_events`
- ✅ `lead_import_events`
- ✅ `lead_field_mappings`

### Properties Table Should Have:
- ✅ `is_active` column (BOOLEAN, NOT NULL, DEFAULT true)

### Rent Records Table Should Have:
- ✅ `stripe_payment_intent_id` column
- ✅ `payment_status` column
- ✅ `paid_at` column

### Notifications Table Should Have:
- ✅ `email_sent_at` column
- ✅ `email_delivered_at` column
- ✅ `email_failed_at` column
- ✅ `email_error` column
- ✅ `push_sent_at` column
- ✅ `push_delivered_at` column
- ✅ `push_failed_at` column
- ✅ `push_error` column

## Manual Verification Checklist

- [ ] All migration files exist in `supabase/migrations/`
- [ ] Staging database has all tables listed above
- [ ] Production database has all tables listed above
- [ ] Column counts match between staging and production
- [ ] `properties.is_active` column exists in both environments
- [ ] `rent_records` has Stripe-related columns in both environments
- [ ] `notifications` table has email/push tracking columns in both environments
- [ ] RLS policies are enabled on all new tables
- [ ] Indexes are created on all new tables

## Next Steps

1. **If migrations are missing in staging:**
   - Run missing migrations in Supabase Dashboard → Staging Project → SQL Editor

2. **If migrations are missing in production:**
   - Run missing migrations in Supabase Dashboard → Production Project → SQL Editor
   - ⚠️ **Important**: Test in staging first before applying to production

3. **If schemas don't match:**
   - Review differences reported by verification script
   - Apply missing migrations to the environment that's behind
   - Re-run verification script to confirm

4. **After verification:**
   - Document any manual steps taken
   - Update this report with verification results
   - Ensure both environments are fully congruent before proceeding
