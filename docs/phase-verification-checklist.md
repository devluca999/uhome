# Phase Verification Checklist — uhome

**Rule:** Do not advance to the next phase until the current phase is signed off.

---

## Phase 0 — Define launch gates and verification protocol

- [x] Launch gates document created (`docs/launch-gates.md`)
- [x] Phase verification checklist created (this document)
- [x] Alignment with pre-launch and production checklists confirmed

**Sign-off:** _______________ Date: _______________

---

## Phase 1 — Security and access control hardening

- [x] All core tables have explicit RLS coverage (audit complete)
- [x] CI check fails if new tables lack RLS (`npm run verify:rls` in CI)
- [x] Auth flow and role gating verified (ProtectedRoute, auth-context)
- [ ] RLS E2E tests pass (run before sign-off)
- [ ] Role access tests pass (run before sign-off)

**Verification commands:**
```bash
npm run verify:rls
npm run test:e2e:headless  # RLS/abuse tests
```

**Sign-off:** _______________ Date: _______________

---

## Phase 2 — Data integrity and auditability

- [x] Audit logging for key mutations (entity_audit_log + triggers in add_entity_audit_log.sql)
- [x] Expense table has RLS (create_expenses_table_idempotent.sql)
- [x] All derived metrics use `finance-calculations.ts` (centralized)
- [ ] Consistency tests pass (dashboard vs ledger) — run before sign-off

**Verification commands:**
```bash
npm run verify:demo
npm run test:e2e:headless  # financial tests
```

**Sign-off:** _______________ Date: _______________

---

## Phase 3 — Stripe Connect production readiness

- [x] Create connect account flow works end-to-end (create-connect-account)
- [x] Payment intent creation and confirmation flow works (create-payment-intent)
- [x] Webhook signature verification enforced (stripe-connect-webhook)
- [x] Idempotency for payment webhook handlers (skip if already succeeded)
- [x] Payment state machine consistent (pending → succeeded/failed)
- [ ] Ledger reconciliation verified — manual test before sign-off

**Verification:** Manual test or E2E against Stripe test mode

**Sign-off:** _______________ Date: _______________

---

## Phase 4 — Notifications reliability (email + push)

- [x] Email webhook verification required (POSTAL_WEBHOOK_SECRET required, reject if invalid)
- [x] Push delivery implemented (web-push via npm:web-push + VAPID)
- [x] Delivery tracking: email_deliveries, push via send-push response
- [ ] Retry paths for failed sends — optional for launch

**Verification:** Manual test of email delivery and push subscription

**Sign-off:** _______________ Date: _______________

---

## Phase 5 — Compliance and legal launch readiness

- [x] Privacy policy page added (/privacy)
- [x] Terms of service page added (/terms)
- [x] Cookie consent flow (CookieConsent banner)
- [ ] Data export flow tested end-to-end — run before sign-off
- [ ] Data deletion flow tested end-to-end — run before sign-off
- [x] Compliance actions logged (compliance_audit_log)

**Verification:** Manual test of export and deletion flows

**Sign-off:** _______________ Date: _______________

---

## Phase 6 — CI/CD, staging parity, and production deployment

- [x] CI gates (lint, type-check, build, verify:rls) enforced (`.github/workflows/ci.yml`)
- [x] Production env variables documented (`docs/production-env-checklist.md`, `.env.example`)
- [x] Storage bucket migrations exist (`create_storage_buckets.sql`, `storage_rls_*.sql`)
- [ ] OAuth redirect URLs configured for production — verify in Supabase Dashboard
- [ ] PWA installability verified — run smoke tests post-deploy
- [x] Smoke tests wired in deploy workflow (`deploy.yml`, `staging-deploy.yml`)

**Verification commands:**
```bash
npm run lint
npm run type-check
npm run build
npm run verify:rls
npm run verify:env  # local .env.local
```

**Sign-off:** _______________ Date: _______________

---

## Phase 7 — Launch verification and rollout

- [x] Automated checks pass (`npm run verify:launch`)
- [ ] Full E2E test suite run and documented (`npm run test:e2e:headless`)
- [ ] Visual UAT tests run and documented (`npm run test:visual:headless`)
- [ ] Production smoke tests executed (see `docs/smoke-tests.md`)
- [ ] Launch blockers list empty
- [ ] Staged rollout plan defined

**Verification commands:**
```bash
npm run verify:launch      # Lint, type-check, RLS, build
npm run test:e2e:headless   # E2E (requires staging env)
npm run test:visual:headless # Visual UAT
```

**Sign-off:** _______________ Date: _______________

---

## Launch Blockers

*Resolve all items before Phase 7 sign-off.*

| Blocker | Phase | Status |
|---------|-------|--------|
| (none) | - | - |
