# Environment Variables Reference

Complete reference for environment variables used in the uhome codebase.

**How Local / Staging / Production map to Supabase and Vercel:** see [environment-mapping.md](./environment-mapping.md) (uhome staging + uhome-app, `develop` vs `main`, Preview vs Production).

---

## Client-Side Variables (`VITE_*`)

These are embedded at build time by Vite and available via `import.meta.env.*`.

### Core Supabase

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `VITE_SUPABASE_URL` | Supabase project URL used to initialise the frontend client | `src/lib/supabase/client.ts`, `src/contexts/auth-context.tsx`, `src/pages/settings.tsx`, `src/pages/auth/login.tsx`, `src/lib/tenant-dev-mode.ts`, `src/lib/env-safety.ts`, `src/lib/data-health/data-health-checker.ts`, `src/hooks/admin/use-admin-audit-logs.ts`, `src/vite-env.d.ts`, `tests/helpers/auth-helpers.ts`, `tests/helpers/db-helpers.ts`, `tests/helpers/env-guard.ts`, `tests/helpers/prod-readonly-client.ts`, most `scripts/*`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/staging-deploy.yml` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key paired with the URL above | Same files as `VITE_SUPABASE_URL` (they always appear together) |
| `VITE_ENVIRONMENT` | **Primary** app tier: `development` \| `staging` \| `production` (aliases: `dev`, `local`, `prod`) — parsed in `src/config/environment.ts` | `src/config/environment.ts`, `.github/workflows/staging-deploy.yml`, `.env.example` |
| `VITE_HOSTING_ENV` | Hosting flavour: often `preview` or `production` on Vercel; falls back to `VERCEL_ENV` via `vite.config.ts` | `vite.config.ts`, `src/app-startup.ts`, `src/lib/supabase-hosting-guard.ts` |
| `VITE_STAGING_SUPABASE_PROJECT_REF` | Staging Supabase ref (subdomain only); set on **production** builds so the client can detect prod wired to staging | `src/app-startup.ts`, `src/vite-env.d.ts`, `.github/workflows/deploy.yml` |
| `VITE_SUPABASE_ENV` | **Deprecated:** use `VITE_ENVIRONMENT`; still read as fallback in `src/config/environment.ts` | `src/lib/tenant-dev-mode.ts`, `src/lib/env-safety.ts`, `tests/helpers/env-guard.ts`, `scripts/validate-env.ts`, `.env.local` |

### Debugging

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `VITE_DEBUG_AUTH` | When `'true'`, enables verbose `console.debug` output for the sign-in flow | `src/contexts/auth-context.tsx` |
| `VITE_DEBUG_REALTIME` | When `'true'`, enables verbose logging for realtime channel subscriptions | `src/hooks/use-realtime-subscription.ts` |

### Dev Mode

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `VITE_TENANT_DEV_MODE_ENABLED` | When `'true'`, activates tenant dev mode so mock data flows are available | `src/lib/tenant-dev-mode.ts`, `tests/e2e/dev-mode/dev-mode-activation.spec.ts`, `.env.local` |
| `VITE_LANDLORD_DEV_MODE_ENABLED` | When `'true'`, activates landlord dev mode for mock data flows | `src/lib/tenant-dev-mode.ts`, `.env.local` |

### Third-Party Services

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key passed to `loadStripe()` for client-side payment forms | `src/components/billing/rent-payment.tsx` |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key used when subscribing the browser to Web Push notifications | `src/lib/notifications/push-service.ts` |
| `VITE_SENTRY_DSN` | Sentry DSN for client-side error tracking (planned, docs only) | `docs/monitoring.md` |
| `VITE_APP_URL` | Application URL used for OAuth callback construction and marketing screenshots | `scripts/screenshot-marketing-demo.ts`, `docs/environment_setup.md` |

### Feature Flags

All feature flags live in `src/lib/feature-flags.ts`. Set to `'true'` to enable or `'false'` to disable. Defaults shown in parentheses.

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_ENABLE_TENANT_VIEW_MODES` | Enables tenant view mode switching | `true` |
| `VITE_ENABLE_MESSAGING_ENTRY_POINTS` | Shows messaging entry points in the UI | `true` |
| `VITE_ENABLE_EMAIL_NOTIFICATIONS` | Enables email notification features | `false` |
| `VITE_ENABLE_PUSH_NOTIFICATIONS` | Enables push notification features | `false` |
| `VITE_ENABLE_STRIPE_CONNECT` | Enables Stripe Connect payment flows | `false` |
| `VITE_ENABLE_ADMIN_WAITLIST` | Enables admin waitlist management | `true` |
| `VITE_ENABLE_ADMIN_PROMOTIONS` | Enables admin promotions features | `true` |
| `VITE_ENABLE_ADMIN_NEWSLETTER` | Enables admin newsletter features | `true` |
| `VITE_ENABLE_ADMIN_LEADS` | Enables admin leads management | `true` |
| `VITE_ENABLE_RELEASE_TRACKING` | Enables release tracking features | `true` |
| `VITE_ENABLE_STAGING_WORKFLOW` | Enables staging workflow features | `true` |
| `VITE_ENABLE_MANUAL_LEAD_UPLOAD` | Enables manual CSV lead upload | `true` |
| `VITE_ENABLE_DIRECT_SCRAPER_INGESTION` | Enables direct scraper ingestion pipeline | `false` |
| `VITE_ENABLE_API_LEAD_INGESTION` | Enables API-based lead ingestion | `false` |
| `VITE_ENABLE_LEAD_INGESTION_SANDBOX` | Enables lead ingestion sandbox mode | `true` |
| `VITE_ENABLE_GDPR_COMPLIANCE` | Enables GDPR compliance features | `true` |
| `VITE_ENABLE_CCPA_COMPLIANCE` | Enables CCPA compliance features | `true` |

`VITE_ENABLE_STRIPE_CONNECT` is also checked directly in: `src/pages/landlord/property-detail.tsx`, `src/pages/tenant/finances.tsx`, `src/pages/tenant/pay-rent.tsx`, `src/components/billing/rent-payment.tsx`, `src/components/billing/connect-onboarding.tsx`, `src/hooks/use-rent-payment.ts`, `src/components/landlord/payment-settings-form.tsx`.

### Test / Mock

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `VITE_USE_MOCK_PROVIDERS` | When `'true'`, swaps real data providers for mocks during E2E tests | `docs/adapter-architecture.md`, `docs/e2e-testing.md` |

---

## Vite Built-Ins

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `import.meta.env.DEV` | `true` in development mode — gates dev-only logging, debug UI, and bypass flows | 25+ files across `src/` and `tests/` |
| `import.meta.env.MODE` | Current Vite mode string (`'development'`, `'production'`, etc.) | `src/pages/admin/leads/upload.tsx`, `docs/monitoring.md` |

---

## Server-Side / Script Variables (`process.env`)

Used by Node.js scripts, test helpers, and seed utilities. **Never exposed to the browser.**

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `SUPABASE_ENV` | Environment label (`local` / `staging` / `production`) — primary safety gate preventing accidental production operations | `scripts/boot-demo.ts`, `scripts/run-local-tests.ts`, `scripts/validate-env.ts`, `scripts/get-local-supabase-env.ts`, `tests/helpers/env-guard.ts`, `tests/helpers/auth-helpers.ts`, `tests/helpers/reset.ts`, `tests/helpers/db-helpers.ts`, `src/lib/env-safety.ts`, `.env.local`, `.env.test` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key granting full database access (bypasses RLS) — used in scripts and Edge Functions | All `scripts/*` seed/verify files, all Edge Functions, `.github/workflows/deploy.yml`, `.github/workflows/staging-deploy.yml`, `scripts/lead-scraper/config.py` |
| `SUPABASE_SERVICE_KEY` | Alias for the service role key used in test infrastructure | `tests/helpers/auth-helpers.ts`, `tests/helpers/db-helpers.ts`, `tests/helpers/reset.ts`, `scripts/boot-demo.ts`, `scripts/run-local-tests.ts` |
| `TEST_SUPABASE_SERVICE_KEY` | Test-specific alias for the service role key | `.env.test`, `.env.test.example` |
| `SUPABASE_SERVICE_ROLE_KEY_PROD` | Production service role key for cross-environment schema verification | `scripts/verify-cloud-parity.ts`, `scripts/verify-schema-congruence.ts`, `scripts/verify-storage-setup.ts`, `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY_CLOUD` | Alternative name for the cloud service role key | `scripts/verify-cloud-parity.ts`, `.env.example` |
| `SUPABASE_CLOUD_URL` | Cloud Supabase project URL for parity verification | `scripts/verify-cloud-parity.ts`, `.env.example`, `.env.local` |
| `VITE_SUPABASE_URL_PROD` | Production Supabase URL for storage and schema verification | `scripts/verify-storage-setup.ts`, `scripts/verify-schema-congruence.ts` |
| `PROD_SUPABASE_URL` | Alternative name for production Supabase URL | `scripts/verify-schema-congruence.ts` |
| `PROD_SUPABASE_SERVICE_KEY` | Production service key for storage verification | `scripts/verify-storage-setup.ts` |
| `NODE_ENV` | Standard Node.js environment variable | `tests/helpers/env-guard.ts` |

---

## Edge Function Variables (`Deno.env.get`)

Auto-injected by Supabase or set as Edge Function secrets.

### Local Docker (`supabase start`)

Stripe and other custom secrets are **not** on the staging Dashboard; for local dev, put them in **`supabase/functions/.env`** (gitignored). Supabase loads that file when the local stack runs. Start from the template:

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

(PowerShell: `Copy-Item supabase/functions/.env.example supabase/functions/.env`.)

Fill in test-mode `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (Connect endpoint), and `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` (subscription webhook endpoint). Then restart: `npx supabase stop` and `npx supabase start`.

For a **hosted** Supabase project, set the same keys in **Dashboard → Edge Functions → Secrets** or run `supabase secrets set --env-file ...` while linked to that project (does not apply to the local stack by itself).

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `SUPABASE_URL` | Supabase project URL (auto-injected) | All Edge Functions in `supabase/functions/*/index.ts` |
| `SUPABASE_ANON_KEY` | Anon key for non-service-role clients (auto-injected) | `supabase/functions/rate-limit-upload/index.ts`, `rate-limit-message/index.ts`, `rate-limit-invite/index.ts`, `abuse-guard/index.ts`, `generate-receipt/index.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for full DB access (auto-injected) | All Edge Functions |
| `STRIPE_SECRET_KEY` | Stripe secret key for server-side payment processing | `supabase/functions/create-payment-intent/index.ts`, `create-connect-account/index.ts`, `stripe-connect-webhook/index.ts` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for request verification | `supabase/functions/stripe-connect-webhook/index.ts` |
| `POSTAL_WEBHOOK_SECRET` | Postal webhook signing secret for inbound email verification | `supabase/functions/email-webhook/index.ts` |
| `POSTAL_SMTP_HOST` | Postal SMTP server hostname | `supabase/functions/send-email/index.ts` |
| `POSTAL_SMTP_USER` | Postal SMTP username | `supabase/functions/send-email/index.ts` |
| `POSTAL_SMTP_PASS` | Postal SMTP password | `supabase/functions/send-email/index.ts` |
| `POSTAL_SMTP_PORT` | Postal SMTP port (default: `587`) | `supabase/functions/send-email/index.ts` |
| `POSTAL_API_URL` | Override for the Postal API URL | `supabase/functions/send-email/index.ts` |
| `POSTAL_API_KEY` | Postal API key (falls back to `POSTAL_SMTP_PASS`) | `supabase/functions/send-email/index.ts` |
| `POSTAL_FROM_EMAIL` | Sender email address (default: `noreply@uhome.app`) | `supabase/functions/send-email/index.ts` |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key | `supabase/functions/send-push/index.ts` |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key for signing push payloads | `supabase/functions/send-push/index.ts` |

---

## CI/CD Variables

Set as GitHub Actions secrets or workflow-level environment variables.

| Variable | Purpose | Referenced In |
|----------|---------|---------------|
| `VITE_SUPABASE_STAGING_URL` | Staging Supabase URL (GitHub secret) | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/staging-deploy.yml` |
| `VITE_SUPABASE_STAGING_ANON_KEY` | Staging Supabase anon key (GitHub secret) | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/staging-deploy.yml` |
| `VISUAL_TEST_BASE_URL` | Base URL for visual/UAT tests (default: `http://localhost:1000`) | `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/visual/helpers/visual-helpers.ts`, 15+ test spec files |
| `PROD_SMOKE_TEST` | When `'true'`, enables production smoke tests | `playwright.prod-smoke.config.ts`, `tests/e2e/prod-smoke/*.spec.ts`, `scripts/staging-decommission-readiness.ts` |
| `PROD_SMOKE_BASE_URL` | Base URL for production smoke tests (default: `https://uhome.app`) | `playwright.prod-smoke.config.ts` |
| `PLAYWRIGHT_BASE_URL` | Alternative base URL override for Playwright | `tests/uat/dashboard/dashboard-comprehensive.spec.ts` |
| `CI` | Standard CI flag set by GitHub Actions — controls Playwright retry/worker settings | `playwright.config.ts` |
| `STRIPE_TEST_SECRET_KEY` | Stripe test-mode secret key for staging (docs only) | `docs/ci_cd.md`, `docs/git-workflow.md`, `docs/staging-environment.md` |
| `POSTAL_STAGING_SMTP_HOST` | Postal staging SMTP host for sandbox testing (docs only) | `docs/ci_cd.md`, `docs/git-workflow.md`, `docs/staging-environment.md` |

---

## TypeScript Declarations

Core declarations live in `src/vite-env.d.ts` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENVIRONMENT`, `VITE_SUPABASE_ENV`, `VITE_HOSTING_ENV`, `VITE_STAGING_SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY`).

Other `VITE_*` variables work at runtime via Vite's `ImportMetaEnv` but may lack explicit typings.

---

## Environment Files

| File | Purpose |
|------|---------|
| `.env.example` | Template: local vs staging vs production naming; copy to `.env.local` |
| `.env.local` | Developer machine (git-ignored) — **local** Supabase CLI *or* **cloud staging** (`VITE_ENVIRONMENT`/ `SUPABASE_ENV` must match the URL) |
| `.env.test` | Playwright / local E2E defaults (often `127.0.0.1` + CLI keys); merged in `tests/helpers/load-test-env.ts` so `.env.local` wins for shared keys |
| `.env.test.example` | Template for `.env.test` |
| `supabase/functions/.env` | Edge Function secrets (Stripe, etc.) for **local** CLI — see `.env.example` comment and Edge Function section above |
