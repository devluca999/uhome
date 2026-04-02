# Sprint 2 Session Summary

**Last updated:** April 2, 2026  

---

## Sprint 2 status: complete (code)

All eight Sprint 2 checklist items are **implemented in the repo**. Remaining work is **manual verification**, **deploy/secrets**, and **Sprint 0 / Sprint 3** items from `docs/LAUNCH_SPRINT_CHECKLIST.md`.

| Item | Summary |
|------|---------|
| 12 — Onboarding card | `OnboardingCard` on landlord dashboard when `properties.length === 0` |
| 13 — Empty-state audit | Audited; empty states in place |
| 14 — Stripe Customer Portal | Settings billing UI; `use-stripe-portal`; `create-portal-session` (org-scoped lookup) |
| 15 — Trial UI | Shown in Settings billing when `trialing` + `trial_end` |
| 16 — Plan gates | Properties: `canAddProperty`; Finances: `advancedFinancials`, `csvExport`; demo bypass |
| 17 — Sentry | `src/app-startup.ts` + `VITE_SENTRY_DSN` |
| 18 — `dist/` gitignore | Verified |
| 19 — GitHub → Vercel | `deploy.yml` uses `amondnet/vercel-action@v25`; add `VERCEL_*` secrets + disable duplicate auto-deploy if needed |

---

## Earlier session (April 2, 2026) — original notes

### Completed that session

- **Item 17:** Sentry DSN / initialization  
- **Item 18:** `dist/` gitignore verification  
- **Item 12:** Landlord onboarding card  
- **Item 13:** Empty-state audit  

### Critical discovery (still true)

**Sprint 0 Item 1 (`organizationId`):** Implemented in `auth-context.tsx` via `organization_members`.

---

## Follow-up implementation (same sprint)

- Fixed Settings `useSubscription()` destructuring (removed invalid `subscription` object).  
- Added billing section, `trialEnd` in `use-subscription`, portal Edge Function org lookup.  
- Plan gates on Properties and Finances; `deploy.yml` Vercel step.

---

## Next actions

1. **Manual QA:** Settings billing, portal (after function deploy), free-plan property limit, finances gates.  
2. **Deploy:** `supabase functions deploy create-portal-session`; confirm secrets.  
3. **CI:** GitHub secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.  
4. **Sprint 0:** Checkout session, webhook, OAuth, etc. (see checklist).  
5. **Docs:** Before each commit/push, use [docs/PRE_COMMIT_CHECKLIST.md](docs/PRE_COMMIT_CHECKLIST.md).

---

## Repository references

**Key files (Sprint 2):**  
`src/pages/settings.tsx`, `src/hooks/use-subscription.ts`, `src/hooks/use-stripe-portal.ts`, `supabase/functions/create-portal-session/index.ts`, `src/pages/landlord/properties.tsx`, `src/pages/landlord/finances.tsx`, `.github/workflows/deploy.yml`, `src/components/landlord/onboarding-card.tsx`, `src/app-startup.ts`

**Handoffs (historical):**  
`CURSOR_HANDOFF_ITEM14.md`, `QUICK_START_ITEM14.md`, `SETTINGS_AUDIT_ITEM14.md`, `EMPTY_STATE_AUDIT.md`
