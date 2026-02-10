# Staging Decommission

This document describes when and how to safely turn off the cloud Supabase staging project.

## Decision Criteria

Do **NOT** decommission cloud staging until:

1. Local Supabase (CLI + Docker) is the primary CI target
2. `local-e2e` job has been green for **2 consecutive runs**
3. All env guards are active (unit tests pass)
4. `staging-decommission-readiness.ts` exits 0
5. No code paths require cloud staging

## Prerequisites

- [ ] Panic brake migration applied in production: `add_anon_write_panic_brake.sql`
- [ ] Local Supabase runs successfully: `npx supabase start` and `npm run test:local`
- [ ] CI `local-e2e` job passes
- [ ] `npm run verify:staging-decommission` reports PASS

## Steps

1. Run the readiness check:
   ```bash
   npm run verify:staging-decommission
   ```

2. If PASS:
   - Remove the `e2e-tests` (Cloud Staging) job from `.github/workflows/ci.yml`
   - Push and verify CI is green with local-e2e only
   - After 2 consecutive green runs, decommission the staging project in Supabase dashboard

3. If FAIL:
   - Follow the remediation output
   - Fix issues and re-run the check

## Explicit Statement

**Do not decommission the cloud staging Supabase project until `verify:staging-decommission` exits 0 and all criteria above are met.**
