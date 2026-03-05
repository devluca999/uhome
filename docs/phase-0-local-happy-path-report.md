# Phase 0: Local Happy-Path Verification Report

**Date:** 2026-03-04  
**Environment:** Local Docker Supabase + Vite dev server (`npm run dev:demo`)  
**App URL:** http://localhost:1000  
**Purpose:** Verify core landlord and tenant workflows on local instance before Phase 1 (cloud verification).

---

## 1. Scope and environment

- **Commands used:** `npm install`, `npm run dev:demo`
- **Seed:** `scripts/boot-demo.ts` → DB reset + `npm run seed:demo` (seed-production-demo.ts)
- **Demo credentials:** Landlord `demo-landlord@uhome.internal` / `DemoLandlord2024!`; Tenant `demo-tenant@uhome.internal` / `DemoTenant2024!`
- **Screenshots:** See [qa-artifacts/phase-0/README.md](../qa-artifacts/phase-0/README.md). Files were saved to `%LOCALAPPDATA%\Temp\cursor\screenshots\` during the run.

---

## 2. Landlord happy-path results

| Step | Result | Notes |
|------|--------|------|
| Sign up (new landlord) | **PASS** (was FAIL, fixed) | Race condition in auth context caused wrong redirect. Fixed by synchronising in-memory role after DB update. |
| Login (demo landlord) | **PASS** | Redirected to `/landlord/dashboard`. KPIs and quick actions visible. |
| Create property | **PASS** | "Add Property" → PropertyForm → created "Phase 0 Test House". Property appears in list and persists. |
| Add / invite tenant | **PASS** | "Invite Tenant" → Phase 0 Test House, email `phase0-tenant@example.com` → invite link generated (`/accept-invite/<token>`). |
| View finances | **PASS** | `/landlord/finances` loads; KPIs, rent ledger, expenses, charts. |
| View operations | **PASS** | `/landlord/operations` loads; work orders by status (Submitted, Seen, Scheduled, In Progress, Closed). |

---

## 3. Tenant happy-path results

| Step | Result | Notes |
|------|--------|------|
| Login (demo tenant) | **PASS** | Redirected to `/tenant/dashboard`. Summary cards and quick actions visible. |
| View property info (Household) | **PASS** (was FAIL, fixed) | Lease lookup used wrong join path (`leases.tenant_id` vs `tenants.lease_id`). Fixed in `use-active-lease.ts`. |
| Submit maintenance request | **PASS** | "New Request" → Plumbing, "Phase 0 test: bathroom faucet dripping" → submitted. New request appears in tenant list with status "Submitted". |
| Payment (pay rent) | **Not tested** | ENABLE_STRIPE_CONNECT not verified; pay-rent flow treated as config-dependent. |

---

## 4. Cross-role verification

| Check | Result | Notes |
|-------|--------|------|
| Tenant maintenance → Landlord Operations | **PASS** | After tenant submitted the Phase 0 plumbing request, landlord Operations showed **Submitted (2)**. Tenant-submitted request is visible and reflected on landlord dashboard. |

---

## 5. Bug summary and fixes

### Fatal (block happy path) — FIXED

1. **Landlord signup → wrong role/redirect** — **FIXED**  
   - **Root cause:** Race condition. The `handle_new_user` DB trigger always inserts with `role = 'tenant'`. The `onAuthStateChange` listener fires immediately and `fetchUserRole` reads `'tenant'` from the DB before `signUp()` finishes updating the role to `'landlord'`. `ProtectedRoute` then sees `role === 'tenant'` and redirects to `/tenant/dashboard`.  
   - **Fix:** In `src/contexts/auth-context.tsx`, after `signUp` successfully updates the role in the DB, explicitly call `setRole(role)` to synchronise the in-memory auth state before the function returns.  
   - **Re-test result:** **PASS** — New landlord signup now correctly redirects to `/landlord/dashboard`.  
   - **Evidence:** Screenshot `phase0-fix1-landlord-signup-correct-redirect.png`.

2. **Tenant Household – Error loading household** — **FIXED**  
   - **Root cause:** Two issues. (a) The `useActiveLease` hook queried `leases.tenant_id = tenants.id`, but the seed data stores the **auth user UUID** in `leases.tenant_id`, not the `tenants.id`. The correct join path is `tenants.lease_id → leases.id`. (b) When `.maybeSingle()` returned `null` (no matching lease), the dev-mode logging tried to access `leaseData.id`, crashing with `TypeError: Cannot read properties of null`.  
   - **Fix:** Rewrote `src/hooks/use-active-lease.ts` to select `tenants.lease_id` from the tenant record and look up the lease by `leases.id = tenant.lease_id`. Added null guards to prevent crash when no lease exists.  
   - **Re-test result:** **PASS** — Tenant Household now shows property details (Oak Street Apartments, Unit 2A, $1000/month), lease info, housemates tab, and landlord contact card.  
   - **Evidence:** Screenshot `phase0-fix2-tenant-household-working.png`.

### Non-fatal / not tested

- **Payment (Stripe):** Pay-rent flow not exercised; depends on `ENABLE_STRIPE_CONNECT`. Document as config limitation if Stripe is off locally.
- **Accept-invite flow:** Invite link was generated; full flow (new tenant signup → accept invite → tenant dashboard) was not run in this session. Recommend testing in a follow-up.

---

## 6. Readiness decision

**Happy path is functional on the local Docker Supabase instance** after fixing the two fatal issues above.

| Flow | Status |
|------|--------|
| Landlord signup → landlord dashboard | **PASS** (fixed) |
| Landlord login → dashboard, properties, finances, operations | **PASS** |
| Landlord create property, invite tenant | **PASS** |
| Tenant login → dashboard | **PASS** |
| Tenant view household / property info | **PASS** (fixed) |
| Tenant submit maintenance request | **PASS** |
| Cross-role: tenant request → landlord operations | **PASS** |

**Recommendation:** Proceed to Phase 1 (cloud verification). Before deploying:

1. Ensure the two code fixes (`auth-context.tsx` and `use-active-lease.ts`) are committed and deployed.
2. Verify schema/RLS parity between local and cloud Supabase instances.
3. Optionally test accept-invite end-to-end and payment flow (if Stripe is enabled).

---

## 7. Artifacts index

Screenshots and their mapping to steps are listed in [qa-artifacts/phase-0/README.md](../qa-artifacts/phase-0/README.md). No video was recorded; no additional errors warranted recording.

### Fix verification screenshots

| File | Step |
|------|------|
| phase0-fix1-landlord-signup-correct-redirect.png | New landlord signup → correctly arrives at `/landlord/dashboard` |
| phase0-fix2-tenant-household-working.png | Tenant Household → property details, lease info, housemates load correctly |
