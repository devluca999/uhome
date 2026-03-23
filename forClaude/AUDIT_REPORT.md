# uhome — Production Readiness Audit Report
> Generated: 2026-03-22 by P2
> Scope: Pre-Stripe, pre-real-user launch audit

---

## 1. Repository Structure

**Status: GOOD**

- Folder organization is clean: `src/`, `supabase/`, `docs/`, `scripts/`, `tests/`, `forClaude/`
- Frontend/backend/config separation is solid
- `src/config/environment.ts` is a proper central env config — validates at startup, throws on missing vars
- Migrations under `supabase/migrations/` — forward-only, CLI-driven
- Edge Functions under `supabase/functions/` — well-named, single responsibility
- `forClaude/` docs are structurally present but several files are still skeleton-level (roadmap, system_overview have placeholders)

**Gaps:**
- No `CHANGELOG.md` or release notes tracking
- `COMMIT_TEMP.txt` in root — should be gitignored or deleted
- `dist/` is committed — should be gitignored for a Vite/Vercel project
- Several root-level `*.md` audit/report files (100X_BUG_FIX_REPORT, AUDIT_FINDINGS, etc.) — good for history but should be archived to `docs/` or deleted

---

## 2. Branching & Git Workflow

**Status: PARTIALLY COMPLETE — action required**

- `main` and `develop` branches now exist and are correctly mapped to Vercel environments
- `deploy.yml` checks for develop-sourced merges (warning only, not enforced)
- Feature branch convention (`feature/*`, `fix/*`, `hotfix/*`) is documented but not enforced

**Gaps — HIGH PRIORITY:**
- **No branch protection rules confirmed on GitHub** — `main` and `develop` should require PR + passing CI before merge. Without this, direct pushes to `main` are possible.
- **No PR template enforced** — `.github/pull_request_template.md` exists but worth verifying it fires correctly
- **No release tagging strategy** — no versioning (semver or date-based), no git tags on production deploys
- **No CODEOWNERS file** — for a solo founder this is low priority but worth noting for team growth

---

## 3. Deployment Pipeline

**Status: GOOD FOUNDATION — gaps in production deploy step**

- CI workflow is solid: lint → format → type-check → RLS verify → build → E2E (8 shards) → visual tests (4 shards)
- Path-based change detection avoids unnecessary test runs
- Sharded Playwright E2E with merged reports is mature CI setup
- `deploy.yml` has prod/staging URL diff guard — good
- Vercel auto-deploys on push to `main` and `develop` via GitHub integration

**Gaps — HIGH PRIORITY:**
- **`deploy.yml` has no actual deploy step** — the final step says `echo "Deployment steps would be added here"`. Vercel handles deployment automatically via GitHub integration, but this means the CI workflow has no knowledge of whether the Vercel deploy succeeded or failed. No post-deploy smoke test against `app.getuhome.app` is running.
- **No post-deploy smoke test against production URL** — `deploy.yml` runs pre-deploy E2E against staging, but nothing verifies the production URL after Vercel completes the deploy.
- **E2E tests only run on `develop` and PRs** — pushes directly to `main` skip E2E in `ci.yml` (by design per the `if:` condition). The pre-deploy staging smoke test partially covers this but it's against staging, not prod.
- **Visual tests depend on staging secrets** — if `VITE_SUPABASE_STAGING_URL` is not set, visual tests silently fall back to localhost:3000

---

## 4. Environment Configuration

**Status: GOOD — one critical gap**

- `src/config/environment.ts` validates all required vars at startup — will fail loudly if misconfigured
- `lib/env-safety.ts` and `supabase-hosting-guard.ts` prevent seeds/resets from targeting production
- Separate Supabase projects for staging and production are confirmed
- `VITE_ENVIRONMENT` drives environment-aware behavior correctly
- `.env.example` exists as the canonical reference

**Gaps:**
- **Staging Supabase project ref is undocumented** — `forClaude/environment_config.md` has a placeholder for the staging ref. This should be filled in.
- **No secrets rotation schedule** — no documented process for when/how to rotate Supabase service keys, Stripe keys, VAPID keys
- **Feature preview branches all share staging Supabase** — this means parallel PRs can interfere with each other's test data. Acceptable for now, worth noting at scale.
- **Node version mismatch** — CI uses Node 20, Vercel project is configured for Node 24. Should be aligned.

---

## 5. Database Architecture

**Status: SOLID — pre-payment schema gaps**

- RLS is comprehensively documented and covers all core tables
- Forward-only migration strategy is correct
- `verify:rls` runs in CI — proactive RLS coverage check
- Tenant/landlord isolation is well-designed
- Multi-tenant via organizations model is appropriate for the product

**Gaps — HIGH PRIORITY for payments:**
- **Subscription schema not yet migrated** — `stripe-integration-plan.md` defines the schema additions (`stripe_customer_id`, `subscription_status`, `subscriptions` table, `subscription_limits` table) but no migration file for these exists yet in `supabase/migrations/`
- **`stripe_connect_accounts` table referenced in code** (`connect.ts`, `stripe-connect-webhook`) but no confirmed migration for it
- **`payments` table referenced in webhook handler** but no confirmed migration
- **No soft-delete strategy documented** — hard deletes on cascaded data could cause issues with payment/audit history
- **No audit log table for financial transactions** — critical for payment disputes and compliance
- **Backup is on Supabase free tier behavior** — `backup-recovery.md` references Supabase Pro for automated daily backups. Confirm Pro plan is active for production.

---

## 6. Authentication & Security

**Status: STRONG**

- Supabase Auth with email/password confirmed
- RLS covers all core tables with well-thought-out policies
- Service role key is server-side only (Edge Functions) — not exposed to browser
- `env-safety.ts` guards prevent accidental production DB operations
- Rate limiting exists via Edge Functions (`rate-limit-invite`, `rate-limit-message`, `rate-limit-upload`)
- Abuse prevention system exists (`abuse-guard` Edge Function, abuse_events table)
- Admin actions are behind their own Edge Function with auth checks
- `error-boundary.tsx` exists for client-side error containment

**Gaps:**
- **No Stripe webhook secret rotation documented**
- **CORS on stripe-connect-webhook is `*`** — should be locked to Stripe's IP ranges or at minimum verified via signature (signature check is present, so low risk, but `*` CORS is sloppy)
- **No CSP (Content Security Policy) headers configured** — Vite doesn't add these by default; Vercel headers config should add them before launch
- **No documented session timeout policy** — Supabase default is fine but should be explicitly confirmed
- **Cookie consent component exists** but no documented GDPR/CCPA compliance flow for data deletion

---

## 7. Payments (Stripe) — Pre-Integration Review

**Status: WELL PLANNED — not production-ready yet**

The Stripe integration plan is thorough. Architecture decisions are sound:
- Subscription billing is org-level (correct)
- Webhooks handled in Edge Functions (correct)
- Payment Intents created server-side only (correct)
- Webhook signature verification is implemented (correct)
- Idempotency checks exist in webhook handler (correct)

**Gaps — BLOCKERS before enabling payments:**
- **Missing database migrations** for: `subscriptions`, `subscription_limits`, `stripe_connect_accounts`, `payments` tables
- **No `stripe-webhook` Edge Function** for subscription events — only `stripe-connect-webhook` exists. Subscription lifecycle events (`checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`) have no handler.
- **No subscription status enforcement in RLS** — plan limits are documented but no RLS policy or Edge Function guard actually enforces them yet
- **No billing page in UI** — `src/components/billing/` directory exists but needs verification of completeness
- **No trial period implementation** — documented as future but should be decided before launch (free tier vs trial)
- **No failed payment recovery flow** — `past_due` status has no retry or dunning logic
- **No invoice/receipt storage** — Stripe generates invoices but no link to Supabase storage
- **Stripe test mode not documented as a CI secret** — `STRIPE_TEST_SECRET_KEY` listed in ci_cd.md but not confirmed in GitHub Secrets
- **No webhook endpoint registered** — the Edge Function URL must be registered in Stripe Dashboard for webhooks to fire

---

## 8. Logging & Monitoring

**Status: MINIMAL — not production-ready**

- Supabase Dashboard logs are available (API, auth, DB)
- Vercel deployment logs exist
- `log-metrics`, `log-security-event`, `log-upload` Edge Functions exist — good signal
- Audit log fetch via `fetch-audit-logs` Edge Function exists

**Gaps — HIGH PRIORITY:**
- **No Sentry or equivalent** — `monitoring.md` documents it as optional but for real users with payments, error tracking is mandatory. A silent crash during checkout is unacceptable.
- **No uptime monitoring** — no UptimeRobot, Better Uptime, or equivalent watching `app.getuhome.app`
- **No alerting** — no notifications for deploy failures, DB issues, or error spikes
- **No structured logging** — Edge Functions use `console.error/log` only
- **No performance monitoring** — no Core Web Vitals tracking, no slow query alerts

---

## 9. Performance & Scaling

**Status: ACCEPTABLE for MVP scale**

- Vite build pipeline is fast and production-optimized
- Vercel CDN serves static assets globally
- Supabase handles connection pooling
- Pagination likely exists in hooks (not fully audited)

**Gaps:**
- **No database index audit** — as data grows, queries on `property_id`, `user_id`, `tenant_id` foreign keys need indexes. Supabase adds some automatically but custom indexes for common query patterns are not documented.
- **No caching strategy** — no React Query, SWR, or equivalent. Direct Supabase hooks mean every navigation re-fetches. This is the direct-Supabase coupling tech debt noted in `tech_debt.md`.
- **No image optimization** — documents and property images go to Supabase Storage. No CDN transform pipeline for image resizing.
- **No background job queue** — recurring operations (rent reminders, subscription checks) have no execution mechanism beyond webhook triggers.

---

## 10. CI/CD & Automation

**Status: STRONG**

- GitHub Actions CI is mature: lint, format, type-check, RLS verify, build, sharded E2E, visual tests
- Path-based change detection is efficient
- Playwright sharding (8x E2E, 4x visual) keeps CI fast
- `verify:rls` in CI is a strong proactive security check
- `staging-deploy.yml` and `deploy.yml` exist with appropriate triggers

**Gaps:**
- **No migration check in CI** — no step verifies that migration files haven't been edited after the fact, or that `supabase/migrations/` is consistent with the schema
- **No release tagging** — production deploys don't create a git tag or GitHub Release
- **`deploy.yml` deploy step is a stub** — see Section 3
- **Node version inconsistency** — CI on Node 20, Vercel on Node 24

---

## 11. Backup & Disaster Recovery

**Status: DOCUMENTED — not confirmed active**

- `backup-recovery.md` is thorough and correct
- Pre-migration backup checklist exists
- `verify:schema-congruence` script exists

**Gaps:**
- **Supabase Pro plan not confirmed** — automated daily backups require Pro. Free tier has limited backup access. This must be confirmed before real user data is stored.
- **No tested restore** — the backup process is documented but a restore has likely never been tested end-to-end. A single dry-run restore should happen before launch.
- **No secrets backup** — if GitHub Secrets or Vercel env vars are lost, recovery requires manual reconstruction. A secure offline record (1Password, etc.) should exist.

---

## 12. Documentation

**Status: GOOD SKELETON — gaps in live content**

| File | Status |
|------|--------|
| `system_overview.md` | Skeleton — most sections are placeholder links |
| `architecture.md` | Good structure, some placeholders |
| `database_schema.md` | Good pointers, no entity-level detail |
| `deployment_pipeline.md` | NOW COMPLETE (updated this session) |
| `environment_config.md` | NOW COMPLETE (updated this session) |
| `security_model.md` | Good structure, threat model section empty |
| `roadmap.md` | Nearly empty — current focus sections blank |
| `decisions_log.md` | Only 2 entries — underused |
