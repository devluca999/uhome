-- Verification Script for All Phased Development Plan Migrations
-- Run this in both STAGING and PRODUCTION databases to verify schema congruence
-- Compare results between environments to ensure they match

-- ============================================================================
-- PHASE 3: Notifications & Messaging Infrastructure
-- ============================================================================

-- Check email notification tables
SELECT 
  'email_deliveries' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'email_deliveries'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'email_preferences' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'email_preferences'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
-- Check push notification tables
SELECT 
  'push_subscriptions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
-- Check notifications table columns
SELECT 
  'notifications.email_sent_at' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'email_sent_at'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'notifications.push_sent_at' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'push_sent_at'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

-- ============================================================================
-- PHASE 4: Payments (Stripe Connect)
-- ============================================================================
UNION ALL
SELECT 
  'stripe_connect_accounts' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stripe_connect_accounts'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'payments' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'payment_settings' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_settings'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
-- Check rent_records Stripe columns
SELECT 
  'rent_records.stripe_payment_intent_id' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rent_records' 
    AND column_name = 'stripe_payment_intent_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'rent_records.payment_status' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rent_records' 
    AND column_name = 'payment_status'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

-- ============================================================================
-- PHASE 5: Sys Admin / Internal Ops Console
-- ============================================================================
UNION ALL
SELECT 
  'waitlist' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'waitlist'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'promo_codes' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'promo_codes'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'newsletter_campaigns' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'newsletter_campaigns'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'leads' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'leads'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

-- ============================================================================
-- PHASE 6: Lead Scraper
-- ============================================================================
UNION ALL
SELECT 
  'scraper_runs' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'scraper_runs'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'scraper_kill_switch' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'scraper_kill_switch'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

-- ============================================================================
-- PHASE 7: Compliance & Documentation
-- ============================================================================
UNION ALL
SELECT 
  'data_deletion_requests' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'data_deletion_requests'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'data_export_requests' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'data_export_requests'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'compliance_audit_log' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'compliance_audit_log'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

-- ============================================================================
-- PHASE 8: Sys Admin Release Version Control
-- ============================================================================
UNION ALL
SELECT 
  'app_releases' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'app_releases'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'feature_flags' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'feature_flags'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'release_events' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'release_events'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

-- ============================================================================
-- PHASE 10: Hybrid Lead Ingestion System
-- ============================================================================
UNION ALL
SELECT 
  'lead_import_events' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'lead_import_events'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'lead_field_mappings' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'lead_field_mappings'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
-- Check leads table Phase 10 columns
SELECT 
  'leads.phone' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'phone'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'leads.normalized_email' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'normalized_email'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'leads.import_event_id' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'import_event_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

-- ============================================================================
-- Property Active Status (UI Enhancement)
-- ============================================================================
UNION ALL
SELECT 
  'properties.is_active' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'is_active'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

ORDER BY table_name;

-- ============================================================================
-- Summary Count
-- ============================================================================
SELECT 
  COUNT(*) FILTER (WHERE status = '✅ EXISTS') as tables_exist,
  COUNT(*) FILTER (WHERE status = '❌ MISSING') as tables_missing,
  COUNT(*) as total_checks
FROM (
  -- Same query as above, but wrapped for counting
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'email_deliveries'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'email_preferences'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'stripe_connect_accounts'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'payments'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'payment_settings'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'waitlist'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'promo_codes'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'newsletter_campaigns'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'leads'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'scraper_runs'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'scraper_kill_switch'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'data_deletion_requests'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'data_export_requests'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'compliance_audit_log'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'app_releases'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'feature_flags'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'release_events'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'lead_import_events'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'lead_field_mappings'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
) as all_checks;
