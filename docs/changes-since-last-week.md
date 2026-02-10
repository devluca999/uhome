# Changes since last week

**Period:** ~1 week (through 2026-02-09)  
**Commit:** `2fe0c57` — chore: sync docs, config, components, and tooling  
**Scope:** 194 files changed, 19,333 insertions, 1,180 deletions

---

## Summary by area

- **Documentation** — New and updated docs (compliance, staging, testing, release, env).
- **CI/CD & config** — Workflows, ESLint flat config, Playwright prod-smoke, env examples.
- **Scripts** — Verification, seeding, lead scraper, local Supabase, RLS/env checks.
- **Admin** — Leads, newsletter, promotions, releases, waitlist; new components and pages.
- **Landlord** — Payment settings, tenant detail/list components; updates to KPIs, modals, work orders.
- **Tenant** — Pay-rent page, billing components, rent payment hook.
- **Shared / app** — Layouts, router, settings, cookie consent, UI (alert, drawer, switch).
- **Backend / Supabase** — Edge functions (Stripe, email, push, leads, delete-account), migrations.
- **Libraries** — Currency, leads, newsletter, notifications, Stripe Connect, waitlist, metrics, env-safety, feature flags.
- **Tests** — Prod-smoke E2E, unit tests (env-guard, env-safety, prod-readonly-client), helpers.

---

## 1. Documentation

| Change | File |
|--------|------|
| Updated | `docs/ci_cd.md`, `docs/production-checklist.md`, `docs/security/data-integrity-audit.md` |
| Added | `docs/compliance/ccpa-compliance.md`, `docs/compliance/gdpr-compliance.md` |
| Added | `docs/git-workflow-setup.md`, `docs/git-workflow.md` |
| Added | `docs/launch-gates.md`, `docs/local-testing.md`, `docs/newsletter-tracking-endpoints.md` |
| Added | `docs/phase-verification-checklist.md`, `docs/production-env-checklist.md` |
| Added | `docs/release-process.md`, `docs/staging-decommission.md`, `docs/staging-environment.md` |
| Added | `docs/supabase-budget.md` |
| Added | `docs/testing/cloud-latency-scale-testing.md`, `docs/testing/testing-lanes.md` |
| Added | `AUDIT_FINDINGS.md`, `AUDIT_FIXES_SUMMARY.md`, `DATA_CONSISTENCY_FIX.md`, `MIGRATION_VERIFICATION_REPORT.md` |

---

## 2. CI/CD, config & tooling

| Change | File |
|--------|------|
| Updated | `.env.example`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.vscode/extensions.json` |
| Added | `.env.test.example`, `.github/pull_request_template.md`, `.github/workflows/staging-deploy.yml` |
| Updated | `package.json`, `package-lock.json`, `playwright.config.ts`, `tsconfig.json` |
| Added | `eslint.config.js`, `playwright.prod-smoke.config.ts`, `vitest.config.ts` |
| Added | `public/sw-push.js` |

---

## 3. Scripts

| Change | File |
|--------|------|
| Updated | `scripts/seed-mock-data.ts`, `scripts/seed-production-demo.ts`, `scripts/verify-schema-congruence.ts` |
| Added | `scripts/diagnose-data-issues.ts`, `scripts/ensure-local-supabase.ts`, `scripts/fix-invalid-lease-rent.ts` |
| Added | `scripts/get-local-supabase-env.ts`, `scripts/launch-verification.ts`, `scripts/load-dotenv.ts` |
| Added | `scripts/run-local-tests.ts`, `scripts/seed-current-month.ts`, `scripts/staging-decommission-readiness.ts` |
| Added | `scripts/test-rls-access.ts`, `scripts/validate-env.ts`, `scripts/verify-env-congruence.ts`, `scripts/verify-rls-coverage.ts` |
| Added | `scripts/lead-scraper/config.py`, `scripts/lead-scraper/scraper.py`, `scripts/lead-scraper/targets.json` |

---

## 4. Admin area

| Change | File |
|--------|------|
| Updated | `src/pages/admin/overview.tsx` |
| Added | `src/pages/admin/leads.tsx`, `src/pages/admin/leads/upload.tsx` |
| Added | `src/pages/admin/newsletter.tsx`, `src/pages/admin/promotions.tsx`, `src/pages/admin/releases.tsx`, `src/pages/admin/waitlist.tsx` |
| Added | `src/components/admin/newsletter-campaign-form.tsx`, `src/components/admin/promo-code-form.tsx` |

---

## 5. Landlord area

| Change | File |
|--------|------|
| Updated | `src/components/landlord/kpi-strip.tsx`, `src/components/landlord/property-card.tsx` |
| Updated | `src/components/landlord/rent-summary-modal.tsx`, `src/components/landlord/task-distribution-modal.tsx` |
| Updated | `src/components/landlord/tenant-card.tsx`, `src/components/landlord/tenant-distribution-modal.tsx` |
| Updated | `src/components/landlord/work-order-expense-prompt.tsx`, `src/components/landlord/work-order-form.tsx`, `src/components/landlord/work-orders-preview-modal.tsx` |
| Added | `src/components/landlord/payment-settings-form.tsx`, `src/components/landlord/tenant-detail-modal.tsx`, `src/components/landlord/tenant-list-item.tsx` |
| Updated | `src/pages/landlord/dashboard.tsx`, `src/pages/landlord/documents.tsx`, `src/pages/landlord/finances.tsx`, `src/pages/landlord/lease-detail.tsx` |
| Updated | `src/pages/landlord/ledger.tsx`, `src/pages/landlord/maintenance.tsx`, `src/pages/landlord/messages.tsx` |
| Updated | `src/pages/landlord/operations.tsx`, `src/pages/landlord/properties.tsx`, `src/pages/landlord/property-detail.tsx`, `src/pages/landlord/tenants.tsx` |

---

## 6. Tenant area

| Change | File |
|--------|------|
| Added | `src/pages/tenant/pay-rent.tsx` |
| Updated | `src/pages/tenant/dashboard.tsx`, `src/pages/tenant/documents.tsx`, `src/pages/tenant/finances.tsx` |
| Updated | `src/pages/tenant/household.tsx`, `src/pages/tenant/lease-detail.tsx`, `src/pages/tenant/maintenance.tsx`, `src/pages/tenant/messages.tsx` |
| Added | `src/components/billing/connect-onboarding.tsx`, `src/components/billing/rent-payment.tsx` |
| Added | `src/hooks/use-rent-payment.ts`, `src/hooks/use-payment-settings.ts` |

---

## 7. Shared app & UI

| Change | File |
|--------|------|
| Updated | `src/components/layout/admin-layout.tsx`, `src/components/layout/landlord-layout.tsx`, `src/components/layout/sidebar-layout.tsx` |
| Updated | `src/components/providers-wrapper.tsx`, `src/components/settings/nav-item-reorder.tsx`, `src/components/settings/settings-section.tsx` |
| Updated | `src/components/ui/breakdown-modal.tsx`, `src/components/ui/drawer.tsx`, `src/components/ui/switch.tsx` |
| Added | `src/components/ui/alert.tsx`, `src/components/cookie-consent.tsx`, `src/components/data-health/data-health-card.tsx` |
| Updated | `src/contexts/settings-context.tsx`, `src/pages/home.tsx`, `src/pages/auth/accept-invite.tsx`, `src/pages/settings.tsx` |
| Added | `src/pages/legal/privacy.tsx`, `src/pages/legal/terms.tsx` |
| Added | `src/pages/settings/data-deletion.tsx`, `src/pages/settings/data-export.tsx` |
| Updated | `src/router/index.tsx` |

---

## 8. Hooks & data

| Change | File |
|--------|------|
| Updated | `src/hooks/admin/use-admin-performance.ts`, `src/hooks/use-financial-metrics.ts` |
| Updated | `src/hooks/use-landlord-rent-records.ts`, `src/hooks/use-rent-records.ts`, `src/hooks/use-tenants.ts` |
| Added | `src/hooks/use-currency-formatter.ts`, `src/hooks/use-notification-channels.ts`, `src/hooks/use-push-subscription.ts` |

---

## 9. Libraries (lib/)

| Change | File |
|--------|------|
| Updated | `src/lib/finance-calculations.ts`, `src/lib/supabase/client.ts`, `src/lib/tenant-dev-mode.ts` |
| Added | `src/lib/currency/currency-formatter.ts`, `src/lib/currency/currency-types.ts` |
| Added | `src/lib/data-health/data-health-checker.ts` |
| Added | `src/lib/env-safety.ts`, `src/lib/feature-flags.ts` |
| Added | `src/lib/leads/deduplication.ts`, `src/lib/leads/ingestion-pipeline.ts` |
| Added | `src/lib/leads/integrations/apify-adapter.ts`, `apollo-adapter.ts`, `generic-api-adapter.ts`, `scraper-adapter.ts` |
| Added | `src/lib/leads/normalization.ts`, `src/lib/leads/opt-in.ts` |
| Added | `src/lib/messaging-helpers.ts` |
| Added | `src/lib/metrics/metric-formatter.ts`, `src/lib/metrics/metric-types.ts` |
| Added | `src/lib/newsletter/email-templates.ts`, `src/lib/newsletter/newsletter-service.ts` |
| Added | `src/lib/notifications/email-service.ts`, `src/lib/notifications/notification-service.ts`, `src/lib/notifications/push-service.ts` |
| Added | `src/lib/stripe/connect.ts`, `src/lib/waitlist/waitlist-service.ts` |

---

## 10. Supabase (backend)

| Change | File |
|--------|------|
| Updated | `supabase/functions/log-metrics/index.ts` |
| Added | `supabase/config.toml`, `supabase/deno.d.ts`, `supabase/functions/deno.json` |
| Added | `supabase/functions/create-connect-account/index.ts`, `supabase/functions/create-payment-intent/index.ts` |
| Added | `supabase/functions/delete-own-account/index.ts`, `supabase/functions/email-webhook/index.ts` |
| Added | `supabase/functions/ingest-leads/index.ts`, `supabase/functions/send-email/index.ts` |
| Added | `supabase/functions/send-push/index.ts`, `supabase/functions/stripe-connect-webhook/index.ts` |
| Added | Migrations: `20240101000000_initial_schema.sql`, `add_admin_tables.sql`, `add_anon_write_panic_brake.sql`, `add_compliance_tables.sql`, `add_email_notification_tables.sql`, `add_entity_audit_log.sql`, `add_newsletter_tracking_functions.sql`, `add_property_active_status.sql`, `add_push_notification_tables.sql`, `add_release_tracking_tables.sql`, `add_scraper_tables.sql`, `add_stripe_tables.sql`, `enhance_leads_table_phase10.sql`, `verify_all_migrations.sql` |
| Added | `supabase/.branches/_current_branch`, `supabase/.temp/cli-latest` (tooling) |

---

## 11. Types & tests

| Change | File |
|--------|------|
| Updated | `src/types/database.ts` |
| Updated | `tests/helpers/auth-helpers.ts`, `tests/helpers/db-helpers.ts`, `tests/helpers/env-guard.ts`, `tests/helpers/reset.ts` |
| Added | `tests/helpers/prod-readonly-client.ts` |
| Added | `tests/e2e/prod-smoke/financial-invariants.spec.ts`, `tests/e2e/prod-smoke/rls-boundaries.spec.ts` |
| Added | `tests/unit/env-guard.spec.ts`, `tests/unit/env-safety.spec.ts`, `tests/unit/prod-readonly-client.spec.ts` |

---

*Generated from commit `2fe0c57` (2026-02-09).*
