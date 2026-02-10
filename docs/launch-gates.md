# Launch Gates — uhome

**Purpose:** Non-negotiable criteria that must be satisfied before public launch. No phase advances without sign-off on its gates.

## Non-Negotiable Launch Gates

### 1. Security
- All core tables have RLS enabled with explicit policies
- No unauthenticated access to sensitive data
- Role-based access (landlord/tenant/admin) enforced at route and data layer
- No secrets in code; all credentials in environment variables
- Webhook endpoints verify signatures before processing

### 2. Data Integrity
- All derived metrics use centralized calculation layer (`finance-calculations.ts`)
- No orphaned or inconsistent records (verified by consistency checks)
- Audit trail exists for critical mutations
- Database constraints enforce referential integrity

### 3. Payment Reliability (Stripe Connect)
- Payment intent creation requires auth and tenant ownership verification
- Webhook signature verification required; idempotent handling for duplicate events
- Ledger (rent_records, payments) reconciles with Stripe state
- Clear error handling and user feedback for payment failures

### 4. Compliance
- Privacy policy and terms of service pages accessible
- Data export and deletion flows functional and tested
- Cookie consent (if applicable) implemented
- GDPR/CCPA feature flags respected (`ENABLE_GDPR_COMPLIANCE`, `ENABLE_CCPA_COMPLIANCE`)

### 5. Operational Readiness
- CI passes (lint, type-check, build)
- E2E and smoke tests pass or have documented exceptions
- Production environment variables configured
- Storage bucket and OAuth redirects configured for production
- Rollback plan documented and executable

## Phase Advancement Rule

**No phase advances without explicit sign-off.**

Before moving from Phase N to Phase N+1:
1. Complete all items in Phase N
2. Run targeted verification tests for Phase N
3. Update the phase verification checklist
4. Sign off (check the box) in `docs/phase-verification-checklist.md`

## Related Documents

- [Pre-Launch Checklist](pre-launch-checklist.md) — Detailed checklist items
- [Production Checklist](production-checklist.md) — Deployment steps
- [Phase Verification Checklist](phase-verification-checklist.md) — Per-phase sign-off
- [Launch Readiness Summary](LAUNCH_READINESS_SUMMARY.md) — Current status
