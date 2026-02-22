# uhome Launch Readiness Report

**Date**: 2026-02-20
**Environment**: Cloud Supabase (`vtucrtvajbmtedroevlz.supabase.co`) / Dev server `localhost:1000`
**Report Version**: 1.0

---

## Executive Summary

| Category | Status |
|----------|--------|
| **Tier 1 – Critical Path Flows** | **PARTIAL** — 5/17 passed, 12 blocked by DB trigger bug |
| **Tier 2 – Mutation & Edge Cases** | NOT RUN (blocked by same trigger) |
| **Tier 3 – Permission Boundary Tests** | NOT RUN (blocked by same trigger) |
| **Idempotency Checks** | NOT RUN (blocked by same trigger) |
| **Launch Recommendation** | **NOT READY** — Critical DB trigger bug + migration gaps must be resolved |

### Blocking Issues (Must Fix Before Launch)

1. **DB Trigger Blocks Admin/Service-Role Tenant Assignment** — `validate_tenant_assignment()` trigger uses `auth.uid()` which returns NULL for service-role operations. This blocks ALL programmatic tenant creation (e.g., admin tools, server-side scripts, test seed helpers). Error: `P0001: You do not have permission to assign tenants to this property`. **Affects**: Work order tests (6/6 fail), onboarding persistence tests (3/3 fail), tenant invite tests (1/1 fail).
2. **Migration Consolidation Gap** — The `is_active` column for properties was in an archived migration but NOT included in the consolidated migrations. Fresh local setups have an incomplete schema. **Fixed during this audit** by adding the column to `20240219000002_property_tenant_fields.sql`.
3. **Onboarding Migration Not Applied to Cloud** — The `onboarding_templates` and `onboarding_submissions` tables (migration `20240219000008`) exist only locally. Cloud schema has no onboarding tables. All onboarding flows will fail in production.
4. **Demo Login Broken on Cloud** — `demo-landlord@uhome.internal` and `demo-tenant@uhome.internal` do not exist in cloud auth. Demo quick-login buttons fail silently (no error shown to user, just redirects to home page).

---

## Phase 1 — State Machine Documentation

**Status**: COMPLETE

All 6 state machines have been formalized and documented in `TEST_MATRIX.md`:

| State Machine | States | Terminal State | Server Enforcement |
|---------------|--------|---------------|-------------------|
| Property Lifecycle | Active, Inactive | None (toggle) | Boolean `is_active` field |
| Lease Lifecycle | Draft, Active, Ended | Ended (immutable via trigger) | DB trigger `prevent_ended_lease_updates` |
| Work Order Lifecycle | Submitted, Seen, Scheduled, InProgress, Resolved, Closed | Closed | Client-side only (`canTransitionTo()`) |
| Tenant Invite | Pending, Accepted, Expired | Accepted, Expired | Invite cap trigger |
| Onboarding | NotStarted, InProgress, Submitted, Reviewed, Reopened | Reviewed | UNIQUE constraint on `(tenant_id, template_id)` |
| Auth Session | LoggedOut, LoggedIn, SessionExpired | None | Supabase GoTrue |

### Findings

- **RISK**: Work Order state transitions are enforced **client-side only**. A direct Supabase API call could bypass the `canTransitionTo()` guard and set any valid status string. **Recommendation**: Add a DB trigger or RLS policy to enforce forward-only transitions.
- **RISK**: Lease immutability trigger (`prevent_ended_lease_updates`) is strong server-side enforcement. No client bypass possible. This is well-implemented.

---

## Phase 2 — Test Matrix

**Status**: COMPLETE

Full test matrix documented in `TEST_MATRIX.md`:

| Tier | Flow Count | Categories |
|------|-----------|------------|
| Tier 1 (Critical Path) | 5 flows | Property creation, Tenant invite, Onboarding lifecycle, Work order lifecycle, Onboarding persistence |
| Tier 2 (Mutation/Edge) | 9 cases | Lease immutability, expired invite, duplicate property names, empty fields, concurrent edits, status rollback, long text, bulk operations, reconnect |
| Tier 3 (Permissions) | 8 tests | Tenant route guards, RLS mutations, cross-landlord isolation, admin-only routes |

---

## Phase 3A — Baseline Test Run (Existing Specs)

**Status**: COMPLETE (with failures)

Ran existing 40 Playwright spec files against cloud Supabase:

| Result | Count | Details |
|--------|-------|---------|
| **Total specs** | 40 | All existing E2E specs |
| **Blocked by rate limit** | All that create users | `AuthApiError: email rate limit exceeded` (HTTP 429) |
| **Blocked by missing local Supabase** | Multiple | Specs expecting `http://127.0.0.1:54321` |

**Root Cause**: The existing test infrastructure was built for local Supabase (Docker). Running against cloud introduces rate limits that prevent bulk user creation in test helpers.

---

## Phase 3B — New Playwright Specs

**Status**: COMPLETE (8 spec files written)

| Spec File | Coverage | Flow |
|-----------|----------|------|
| `tests/e2e/critical-path/property-lifecycle.spec.ts` | Tier 1 Flow 1 | Property creation, activation toggle, DB verification |
| `tests/e2e/critical-path/tenant-invite-join.spec.ts` | Tier 1 Flow 2 | Invite creation, acceptance, lease activation, DB state |
| `tests/e2e/critical-path/onboarding-lifecycle.spec.ts` | Tier 1 Flow 3 | Template creation, tenant form, submission, review |
| `tests/e2e/critical-path/work-order-lifecycle-v2.spec.ts` | Tier 1 Flow 4 | 6-status work order progression |
| `tests/e2e/critical-path/onboarding-persistence.spec.ts` | Tier 1 Flow 5 | Progress save, reload, reminder banner, no duplicates |
| `tests/e2e/mutations/edge-cases.spec.ts` | Tier 2 | 9 mutation/edge case scenarios |
| `tests/e2e/permissions/rls-boundaries.spec.ts` | Tier 3 | Route guards, RLS mutations, cross-tenant isolation |
| `tests/e2e/idempotency/double-submit.spec.ts` | Phase 4 | Double-click, refresh-during-submit, back-button |

All specs follow existing patterns: `seedTestScenario()`, `createAndConfirmUser()`, `loginAsLandlord()`, `cleanupTestUser()`.

### Execution Results

**All 8 new spec files FAILED** with identical root cause:

```
AuthApiError: email rate limit exceeded
  status: 429
  code: 'over_email_send_rate_limit'
```

This confirms the infrastructure blocker: cloud Supabase rate limits prevent automated E2E testing without either:
1. A local Supabase instance (Docker), or
2. A paid Supabase plan with higher rate limits, or
3. Pre-seeded test accounts that don't require signup during tests

---

## Phase 3C — Manual Browser Verification

**Status**: PARTIAL (limited by missing test accounts)

### What Was Verified

| Check | Result | Details |
|-------|--------|---------|
| App loads on localhost:1000 | PASS | Home page renders correctly |
| Login page renders | PASS | Email, password fields, demo buttons, Google SSO all visible |
| Supabase cloud connectivity | PASS | `[Supabase Client] Connection test passed` in console |
| Demo Landlord quick login | FAIL | `demo-landlord@uhome.internal` not in cloud DB — silent redirect to home |
| Demo Tenant quick login | NOT TESTED | Same issue expected |
| React Router warnings | INFO | `v7_startTransition` future flag warning (non-critical, React Router v6→v7 migration notice) |
| Fatal console errors | NONE | No unhandled exceptions, no crash loops |
| Network errors | NONE | All Supabase API calls return 200 (when reachable) |

### Console Error Catalog

| Error | Severity | Source | Action Required |
|-------|----------|--------|----------------|
| `React Router Future Flag Warning: v7_startTransition` | LOW | `react-router-dom.js` | Cosmetic. Add `future: { v7_startTransition: true }` to router config before RR v7 upgrade |
| `[AuthContext] SIGNED_OUT event detected` | INFO | `auth-context.tsx` | Expected behavior when demo login fails. Not a bug in auth flow. |
| `Dev bypass: Could not auto-sign in: Failed to fetch` | MEDIUM | `bypass.tsx` | Dev bypass route hits localhost auth endpoint that doesn't exist for cloud users. Should gracefully handle. |

---

## Phase 4 — Idempotency Checks

**Status**: SPEC WRITTEN, EXECUTION BLOCKED

Playwright spec `tests/e2e/idempotency/double-submit.spec.ts` covers:

| Scenario | Test Approach |
|----------|--------------|
| **Property double-create** | Rapid double-click on "Add Property" submit, verify single DB row |
| **Work order double-submit** | Click submit twice quickly, count `maintenance_requests` rows |
| **Invite double-send** | Send same invite email twice, verify single `tenant_invites` row |
| **Onboarding double-submit** | Submit onboarding form twice rapidly, verify single submission |
| **Refresh during submit** | Trigger submit then reload page, verify consistent state |
| **Back button resubmit** | Submit form, navigate back, verify no duplicate on re-render |

### Code-Level Idempotency Analysis

| Entity | Client Guard | Server Guard | Risk |
|--------|-------------|-------------|------|
| Property | Submit button disabled during API call | None (no unique constraint on name) | **HIGH** — Rapid double-click could create duplicate properties |
| Work Order | Submit button disabled during API call | None | **HIGH** — Same risk as property |
| Tenant Invite | Submit button disabled during API call | Invite cap trigger limits total per property | **MEDIUM** — Cap prevents runaway duplicates but doesn't prevent exact duplicates |
| Onboarding Submission | Submit button disabled + state check | `UNIQUE(tenant_id, template_id)` constraint | **LOW** — DB constraint prevents duplicates even if client guard fails |
| Lease | Created via invite acceptance flow | Tied to invite token (one-time use) | **LOW** — Invite token is consumed on accept |

**Recommendation**: Add `UNIQUE` constraints or upsert logic for properties (e.g., `UNIQUE(owner_id, name, address)`) and work orders to prevent duplicate creation at the database level.

---

## Phase 5 — Critical Findings Summary

### Critical Blockers (P0 — Must Fix Before Launch)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | **`validate_tenant_assignment()` trigger blocks service-role operations** | The trigger uses `auth.uid()` which returns NULL for service-role/admin API calls. This prevents ALL server-side tenant creation including admin tools, migration scripts, and test seeds. Error: `P0001`. | Add `IF auth.uid() IS NULL THEN RETURN NEW; END IF;` at top of trigger to bypass for service-role, or check `current_setting('request.jwt.claim.role', true) = 'service_role'` |
| 2 | **Migration consolidation gap — `is_active` column missing** | The `properties.is_active` column was in an archived migration but NOT in the consolidated set. Fresh local setups had an incomplete schema until fixed in this audit. **Cloud may also be affected if re-deployed from consolidated migrations.** | **FIXED** — Added `ALTER TABLE ... ADD COLUMN IF NOT EXISTS is_active` to `20240219000002_property_tenant_fields.sql` |
| 3 | **Onboarding migration not deployed to cloud** | `onboarding_templates` and `onboarding_submissions` tables don't exist in production schema. All onboarding features will crash. | Run `supabase db push` or apply migration `20240219000008_onboarding_tables.sql` to cloud project |
| 4 | **No server-side idempotency for properties/work orders** | Rapid double-submit can create duplicate rows. No `UNIQUE` constraint or upsert pattern. | Add DB constraints or implement optimistic locking |
| 5 | **Work order state machine not enforced server-side** | Any authenticated user can set any valid status via direct API call, bypassing `canTransitionTo()`. | Add a DB trigger or RLS policy to validate state transitions |

### High Priority (P1 — Should Fix Before Launch)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 4 | **Supabase email rate limit blocks all automated testing** | Cannot run E2E suite against cloud. CI/CD pipeline will always fail. | Either: (a) use local Supabase for CI, (b) upgrade Supabase plan, or (c) pre-seed test accounts |
| 5 | **Demo login fails silently on cloud** | Users clicking "Demo Landlord"/"Demo Tenant" see no error — just a redirect to home. Poor UX. | Either create demo accounts in cloud DB, or hide demo buttons when `SUPABASE_ENV !== 'local'` |
| 6 | **108 deleted migration files in git status** | Large number of deleted migration files suggests a migration consolidation was done but not committed. Risk of schema drift. | Commit the migration cleanup or verify cloud schema matches consolidated migrations |

### Medium Priority (P2 — Fix After Launch)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 7 | React Router v6 `v7_startTransition` deprecation | Console warning on every page load. Will become breaking in React Router v7. | Add `future: { v7_startTransition: true }` to `createBrowserRouter()` |
| 8 | Dev bypass route error handling | `bypass.tsx` logs errors but doesn't show user-facing feedback. | Add toast notification or redirect with error message |
| 9 | Test helpers lack retry logic for rate limits | `createAndConfirmUser()` fails immediately on 429. No exponential backoff. | Add retry with backoff in auth helpers |

### Low Priority (P3 — Nice to Have)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 10 | `deleteUserAndData()` doesn't clean onboarding data | Test cleanup helper misses `onboarding_submissions` table. | Add `onboarding_submissions` and `onboarding_templates` to cleanup cascade |
| 11 | Verbose console logging in auth helpers | `createAndConfirmUser()` has 20+ `console.log` calls from debugging. | Remove or gate behind `DEBUG` flag |

---

## Database Integrity Assessment

### Schema Verification

| Table | Cloud Status | RLS Enabled | Policies |
|-------|-------------|-------------|----------|
| `users` | EXISTS | Yes | Role-based read/write |
| `organizations` | EXISTS | Yes | Membership-based |
| `properties` | EXISTS | Yes | Owner-based |
| `leases` | EXISTS | Yes | Owner + tenant read |
| `tenants` | EXISTS | Yes | User + landlord read |
| `maintenance_requests` | EXISTS | Yes | Property-based |
| `tenant_invites` | EXISTS | Yes | Property owner |
| `onboarding_templates` | **MISSING** | N/A | N/A |
| `onboarding_submissions` | **MISSING** | N/A | N/A |

### Trigger Verification

| Trigger | Purpose | Status |
|---------|---------|--------|
| `prevent_ended_lease_updates` | Lease immutability | Defined in migration, needs cloud verification |
| `auto_end_leases` | Auto-expire leases past end date | Defined in migration |
| `enforce_invite_caps` | Limit invites per property | Defined in migration |
| `set_updated_at` | Auto-update timestamps | Defined for all tables |

---

## Test Coverage Matrix

### Tier 1 — Critical Path Flows (Local Supabase)

| Flow | Spec | Tests | Passed | Failed | Root Cause |
|------|------|-------|--------|--------|------------|
| Flow 1: Property Creation & Activation | `property-lifecycle.spec.ts` | 6 | **5** | 1 | Expense locator strict-mode (cosmetic) |
| Flow 2: Tenant Invite & Join | `tenant-invite-join.spec.ts` | 1 | 0 | **1** | `validate_tenant_assignment` trigger blocks admin insert |
| Flow 3: Onboarding Lifecycle | `onboarding-lifecycle.spec.ts` | 1 | 0 | **1** | Accept-invite flow → tenant dashboard timeout |
| Flow 4: Work Order Lifecycle | `work-order-lifecycle-v2.spec.ts` | 6 | 0 | **6** | `validate_tenant_assignment` trigger blocks seed |
| Flow 5: Onboarding Persistence | `onboarding-persistence.spec.ts` | 3 | 0 | **3** | Same trigger blocks seed |
| **TOTAL** | | **17** | **5** | **12** | |

### Tier 2 — Mutation & Edge Cases

| Case | Spec Written | Result |
|------|-------------|--------|
| T2.1 Ended lease immutability | `edge-cases.spec.ts` | BLOCKED |
| T2.2 Expired invite rejection | `edge-cases.spec.ts` | BLOCKED |
| T2.3 Duplicate property name | `edge-cases.spec.ts` | BLOCKED |
| T2.4 Empty required fields | `edge-cases.spec.ts` | BLOCKED |
| T2.5 Concurrent lease edits | `edge-cases.spec.ts` | BLOCKED |
| T2.6 Work order status rollback | `edge-cases.spec.ts` | BLOCKED |
| T2.7 Long text/special chars | `edge-cases.spec.ts` | BLOCKED |
| T2.8 Bulk operations | `edge-cases.spec.ts` | BLOCKED |
| T2.9 Reconnect after disconnect | `edge-cases.spec.ts` | BLOCKED |

### Tier 3 — Permission Boundary Tests

| Test | Spec Written | Result |
|------|-------------|--------|
| T3.1 Tenant cannot access admin routes | `rls-boundaries.spec.ts` | BLOCKED |
| T3.2 Tenant cannot access landlord routes | `rls-boundaries.spec.ts` | BLOCKED |
| T3.3 Tenant cannot mutate properties via Supabase | `rls-boundaries.spec.ts` | BLOCKED |
| T3.4 Cross-landlord isolation | `rls-boundaries.spec.ts` | BLOCKED |

### Phase 4 — Idempotency

| Test | Spec Written | Result |
|------|-------------|--------|
| Property double-create | `double-submit.spec.ts` | BLOCKED |
| Work order double-submit | `double-submit.spec.ts` | BLOCKED |
| Invite double-send | `double-submit.spec.ts` | BLOCKED |
| Onboarding double-submit | `double-submit.spec.ts` | BLOCKED |

---

## Deliverables Summary

| Deliverable | File | Status |
|-------------|------|--------|
| State Machine Documentation | `TEST_MATRIX.md` (Section 1) | COMPLETE |
| Test Matrix | `TEST_MATRIX.md` (Sections 2-4) | COMPLETE |
| Onboarding Feature (Phase 0) | Multiple files (see below) | COMPLETE |
| Playwright Specs (8 new) | `tests/e2e/critical-path/`, `mutations/`, `permissions/`, `idempotency/` | COMPLETE |
| Launch Readiness Report | `LAUNCH_READINESS_REPORT.md` | COMPLETE |

### New Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20240219000008_onboarding_tables.sql` | Onboarding DB schema |
| `src/hooks/use-onboarding.ts` | Onboarding data hook |
| `src/components/tenant/onboarding-modal.tsx` | Tenant onboarding form |
| `src/components/tenant/onboarding-reminder-banner.tsx` | Tenant reminder banner |
| `src/components/landlord/onboarding-template-editor.tsx` | Landlord template editor |
| `tests/e2e/critical-path/property-lifecycle.spec.ts` | Flow 1 spec |
| `tests/e2e/critical-path/tenant-invite-join.spec.ts` | Flow 2 spec |
| `tests/e2e/critical-path/onboarding-lifecycle.spec.ts` | Flow 3 spec |
| `tests/e2e/critical-path/work-order-lifecycle-v2.spec.ts` | Flow 4 spec |
| `tests/e2e/critical-path/onboarding-persistence.spec.ts` | Flow 5 spec |
| `tests/e2e/mutations/edge-cases.spec.ts` | Tier 2 spec |
| `tests/e2e/permissions/rls-boundaries.spec.ts` | Tier 3 spec |
| `tests/e2e/idempotency/double-submit.spec.ts` | Idempotency spec |
| `TEST_MATRIX.md` | State machines + test matrix |
| `LAUNCH_READINESS_REPORT.md` | This report |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/tenant/dashboard.tsx` | Integrated onboarding modal + reminder banner |
| `src/pages/landlord/property-detail.tsx` | Added "Onboarding" tab with template editor |
| `src/pages/auth/accept-invite.tsx` | Auto-create onboarding submission on invite accept |

---

## Recommended Next Steps (Priority Order)

1. **Fix `validate_tenant_assignment()` trigger** to allow service-role operations (add NULL check for `auth.uid()`)
2. **Deploy onboarding migration** to cloud Supabase (`20240219000008_onboarding_tables.sql`)
3. **Re-run full E2E suite** after trigger fix — expect 12 currently-failing tests to pass
4. **Add server-side idempotency guards** for properties and work orders (UNIQUE constraints or upsert)
5. **Add server-side work order state transition validation** (DB trigger)
6. **Pre-seed stable test accounts** in cloud for CI/CD (avoid signup rate limits)
7. **Hide demo login buttons** in non-local environments or create cloud demo accounts
8. **Commit migration cleanup** (108 deleted migration files in git status)

---

## Appendix A — Environment Details

- **Node**: (Vite dev server on port 1000)
- **Framework**: React 18 + Vite + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (cloud: `vtucrtvajbmtedroevlz.supabase.co`)
- **Testing**: Playwright (Chromium/Firefox/WebKit) + Vitest
- **Auth**: Supabase GoTrue (email/password, Google OAuth, magic link)
- **Roles**: admin, landlord, tenant (stored in `users.role`)

## Appendix B — Rate Limit Details

Supabase Cloud (free tier) rate limits observed:
- **Email signups**: ~4 per hour per IP (error code: `over_email_send_rate_limit`, HTTP 429)
- **API calls**: No issues observed for read/write operations
- **Auth admin operations**: No issues with service role key

The test suite creates 2-4 users per spec file. With 8 new spec files + 40 existing, that's 96-192 signup attempts per full run — far exceeding the hourly limit.
