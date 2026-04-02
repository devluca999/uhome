# uhome Launch Sprint Checklist

**Generated:** March 25, 2026  
**Source:** P2 CTO Audit  
**Total Items:** 25 across 4 sprints  
**Estimated Time:** ~11.5 hours

---

## 📖 How to Use This Checklist

1. **Work through sprints in order** - Do not start Sprint 1 until Sprint 0 is complete
2. **Track progress** - Check off items as completed
3. **Blockers first** - Sprint 0 items block everything else
4. **Automation available** - P2 can automate 13 of 25 items
5. **Keep docs in sync** - Before every commit / push, run through [PRE_COMMIT_CHECKLIST.md](./PRE_COMMIT_CHECKLIST.md) (progress here, session notes, handoff status)

---

## 🤖 Automation Guide

**P2 can automate these items:**
- Items: 1, 2, 3, 6, 7, 8, 10, 12, 14, 15, 18, 19, 20

**How to use P2:**
Start a Cursor session and say:
> "P2, start Sprint 0 item 1 — wire organizationId into AuthContext."

---

## Sprint 0: Blockers (6 items, ~2.5 hrs)

**Nothing else works until these are done.**

### ✅ Item 1: Wire `organizationId` into AuthContext
**Priority:** CRITICAL  
**Time:** 30 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** `auth-context.tsx` has `organizationId: null` hardcoded. `useSubscription` queries by org ID — without it, billing gates permanently return the free plan for every user. Feature limits, collaborator caps, and plan enforcement are all broken silently.

**What:** After role resolves, query `organization_members` table for the user's org ID and set it in context.

**Status:** ✅ COMPLETE (already implemented in auth-context.tsx lines 67, 174-190, 213)

---

### Item 2: Build `create-checkout-session` Edge Function
**Priority:** CRITICAL  
**Time:** 30 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** The entire billing funnel is blocked at this one missing function. `handleSelect` in `subscription-plans.tsx` is currently a `console.log`.

**What:** 
- Create `supabase/functions/create-checkout-session/index.ts`
- Wire into `subscription-plans.tsx`
- Add `trial_period_days: 30` to the checkout session call
- Full implementation already drafted in `STRIPE_INTEGRATION_ASSESSMENT.md`

---

### Item 3: Fix price display mismatch — $29 vs $29.99
**Priority:** HIGH  
**Time:** 5 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** `plans.ts` shows `monthlyPrice: 2900` but Stripe has `2999`. The UI shows the wrong price to users.

**What:** Update `src/lib/stripe/plans.ts`:
- Landlord monthly: `2900` → `2999`
- Portfolio monthly: `5900` → `5999`

---

### Item 4: Register Stripe subscription webhook endpoint
**Priority:** CRITICAL  
**Time:** 20 min (15 min Stripe + 5 min Supabase)  
**Who:** 🔧 You — Dashboard Config

**Why:** The webhook handler Edge Function exists but the endpoint is not registered in Stripe Dashboard — no subscription lifecycle events are processed.

**What:**
1. **Stripe Dashboard** → Developers → Webhooks → Add endpoint:
   - URL: `https://[project].supabase.co/functions/v1/stripe-subscription-webhook`
   - Events: `customer.subscription.*`
2. Copy signing secret
3. **Supabase Dashboard** → Edge Functions → Secrets:
   - Add `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` = [signing secret]

---

### Item 5: Fix Google OAuth — Supabase + Google Cloud config
**Priority:** HIGH  
**Time:** 20 min (10 min Google + 10 min Supabase)  
**Who:** 🔧 You — Dashboard Config

**Why:** Google sign-in is broken. AuthCallback race condition was already fixed in the audit session. Config mismatch remains.

**What:**
1. **Google Cloud Console:**
   - Authorized Redirect URIs → add `https://[project-ref].supabase.co/auth/v1/callback`
   - Authorized JS Origins → add `https://app.getuhome.app`

2. **Supabase Dashboard:**
   - Site URL: `https://app.getuhome.app`
   - Redirect URLs → add `https://app.getuhome.app/auth/callback`
   - Providers → Google → confirm Client ID + Secret

---

### Item 6: Add role selection step for Google OAuth signups
**Priority:** HIGH  
**Time:** 45 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** Users who sign up via Google bypass the Landlord/Tenant toggle — they land with `role: null` and cannot use the app. Silent failure.

**What:** Add a post-OAuth role selection screen that fires when a new Google user has no role. Default to landlord with an option to switch.

---

## Sprint 1: Brand & Identity (5 items, ~2 hrs)

**Before the first real user sees the app.**

### Item 7: Replace sage green accent with slate/steel
**Priority:** MEDIUM  
**Time:** 15 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** Sage green (`--primary: 142 20% 58%`) is still active everywhere. Brand has moved to cooler slate/steel to complement the chrome house aesthetic.

**What:** Update `--primary` HSL in `src/index.css`. Suggested: `hsl(215, 15%, 55%)`. All `text-primary`, `bg-primary`, `border-primary`, and `ring` update automatically.

---

### Item 8: Add premium typeface — Geist or DM Sans
**Priority:** MEDIUM  
**Time:** 10 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** App uses system font stack. At this level of UI polish, typography is the weakest element.

**What:** Add via Google Fonts or Fontsource. Override `font-family` in `index.css`. Recommendation: **Geist** (technical-premium) or **DM Sans** (editorial warmth).

---

### Item 9: Create SVG version of the chrome house logo
**Priority:** MEDIUM  
**Time:** 45 min  
**Who:** 🖥️ Cursor

**Why:** The 1MB PNG does not scale cleanly at nav/favicon sizes. SVG needed for nav bar, login header, favicon, and PWA icons.

**What:**
- Produce a clean SVG redraw of the chrome house
- Replace `public/logo.png`
- Update favicon references in `index.html`

---

### Item 10: Tighten home.tsx — minimal on-brand fallback page
**Priority:** LOW  
**Time:** 30 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** Current home page (three icon feature cards) is the fallback for direct URL access. Should feel intentional, not placeholder-like.

**What:** Chrome house logo + one-line tagline + Sign In / Get Started buttons. Clean, centered. Remove feature description cards.

---

### Item 11: Wire login CTA on getuhome.app → app.getuhome.app
**Priority:** MEDIUM  
**Time:** 15 min  
**Who:** 🔧 You — Lovable Editor

**Why:** Marketing site and app are disconnected. Users have no path from `getuhome.app` into the product.

**What:** In the Lovable editor, update all Sign In / Get Started CTAs to:
- `https://app.getuhome.app/login`
- `https://app.getuhome.app/signup`

DNS is already configured in Vercel.

---

## Sprint 2: Reliability & UX Polish (8 items, ~4 hrs)

**Real users expect these. Gaps here cause churn.**

### ✅ Item 12: New landlord onboarding — first-run experience
**Priority:** HIGH  
**Time:** 1 hr  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** New landlords land on an empty dashboard with no guidance. The `use-onboarding` hook exists but no UI is wired.

**What:** Prompt card for new landlords with zero properties — "Add your first property to get started" with a primary CTA. Optionally pre-load demo data with a dismissible banner.

**Status:** ✅ COMPLETE (onboarding card implemented)

---

### ✅ Item 13: Empty-state audit across all feature panels
**Priority:** HIGH  
**Time:** 1 hr  
**Who:** 🔍 You — QA / 🖥️ Cursor

**Why:** Every panel needs a helpful empty state — Properties, Tenants, Finances, Operations, Documents, Messages, Maintenance.

**What:** Walk every landlord and tenant page with a fresh account. Log every blank panel. Fix each with message + CTA.

**Status:** ✅ COMPLETE (all pages audited, comprehensive coverage)

---

### ✅ Item 14: Add Stripe Customer Portal for self-serve billing
**Priority:** CRITICAL  
**Time:** 45 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** Users cannot cancel, upgrade, or update their payment method. Required user expectation and legal obligation in most jurisdictions.

**What:**
- Create `supabase/functions/create-portal-session/index.ts`
- Add "Manage billing" button in Settings
- Stripe hosts all portal UI

**Status:** ✅ COMPLETE — Billing section in `src/pages/settings.tsx`; `useSubscription` includes `trial_end`; Edge Function resolves org via `organization_members` then `subscriptions.organization_id`. Deploy function + Stripe portal config remains manual.  
**Reference:** `CURSOR_HANDOFF_ITEM14.md` (historical context)

---

### Item 15: Add trial status UI to billing section
**Priority:** HIGH  
**Time:** 30 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** Users in 30-day trial have no visibility into when it ends. `status === 'trialing'` is in the type system but has no UI.

**What:** When `status === 'trialing'`, show "Your trial ends on [date]. Upgrade to keep access." with a direct upgrade CTA.

**Status:** ✅ COMPLETE (integrated into Item 14 billing section)

---

### ✅ Item 16: Plan gate enforcement audit
**Priority:** HIGH  
**Time:** 1 hr  
**Who:** 🖥️ Cursor / 🔍 You — QA

**Why:** After `organizationId` is wired, verify `canAddProperty()`, `canAddCollaborator()`, and `hasFeature()` are called at every gate. Free users hitting limits should see an upgrade prompt, not an error.

**What:** Test adding a property on free plan (limit 1), inviting a collaborator, accessing advanced financials. Each gate needs an upgrade modal.

**Status:** ✅ COMPLETE (implementation) — `canAddProperty` on landlord Properties (`src/pages/landlord/properties.tsx`); `hasFeature('advancedFinancials')` and `hasFeature('csvExport')` on Finances (`src/pages/landlord/finances.tsx`); landlord-demo `viewMode` bypasses gates. **`canAddCollaborator`:** deferred (no collaborator-invite UI yet); noted in `src/lib/stripe/plans.ts`. **QA:** Run manual tests on production/staging per checklist.

---

### ✅ Item 17: Confirm Sentry DSN is configured in production
**Priority:** MEDIUM  
**Time:** 10 min  
**Who:** 🔧 You — Vercel Dashboard

**Why:** `@sentry/react` is in dependencies but does nothing without the DSN. Production errors are currently invisible.

**What:** Vercel Dashboard → Project → Settings → Environment Variables → confirm `VITE_SENTRY_DSN` is set for Production.

**Status:** ✅ COMPLETE (Sentry configured with smart filtering)

---

### ✅ Item 18: Verify dist/ is gitignored and not committed
**Priority:** LOW  
**Time:** 5 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** `dist/` appears in repo listing. Build output should never be tracked — inflates repo size, causes merge conflicts.

**What:** Confirm `/dist` is in `.gitignore`. If tracked: `git rm -r --cached dist/` then commit.

**Status:** ✅ COMPLETE (verified not tracked)

---

### ✅ Item 19: Wire Vercel deploy into GitHub Actions (CI gate)
**Priority:** MEDIUM  
**Time:** 30 min (🖥️ Cursor) + config (🔧 You)  
**Who:** 🤖 P2 / 🖥️ Cursor + 🔧 You — GitHub Secrets

**Why:** `deploy.yml` ends with an echo placeholder. Vercel deploys independently — broken builds can reach production before CI fails.

**What:**
- Add `amondnet/vercel-action` to `deploy.yml`
- Add GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Disable Vercel's GitHub auto-deploy in project settings

**Status:** ✅ COMPLETE (workflow) — `.github/workflows/deploy.yml` uses `amondnet/vercel-action@v25` with `--prod`. **Manual:** Add the three GitHub secrets; disable Vercel Git auto-deploy for `main` if Actions owns production.

---

## Sprint 3: Go-to-Market Hardening (6 items, ~3 hrs)

**For sustained growth and operational safety post-launch.**

### Item 20: Add Dependabot for automated security patches
**Priority:** MEDIUM  
**Time:** 10 min  
**Who:** 🤖 P2 / 🖥️ Cursor

**Why:** No `.github/dependabot.yml` exists. Stack receives frequent security patches — manual monitoring is not sustainable.

**What:** Create `.github/dependabot.yml` with weekly npm ecosystem updates targeting `develop` branch.

---

### Item 21: Set branch protection on main in GitHub
**Priority:** HIGH  
**Time:** 5 min  
**Who:** 🔧 You — GitHub Settings

**Why:** `deploy.yml`'s branch source check is a soft warning — direct pushes to `main` are not blocked. A mistaken push deploys to production without CI passing.

**What:** GitHub → Settings → Branches → rule for `main`:
- Require PR
- Require CI pass
- Block force pushes
- No direct pushes

---

### Item 22: Verify receipt PDF branding — free vs paid tiers
**Priority:** LOW  
**Time:** 30 min  
**Who:** 🔍 You — QA Test

**Why:** "uhome-branded receipts on free, custom on paid" is a documented feature gate. Needs a real end-to-end test to confirm it works.

**What:** Generate a receipt as free landlord and as paid landlord. Confirm PDF output matches each plan's gate.

---

### Item 23: Confirm transactional email is configured
**Priority:** HIGH  
**Time:** 30 min (🔧 Dashboard) + testing (🖥️ Cursor if needed)  
**Who:** 🔧 You — Supabase Dashboard

**Why:** Supabase's default SMTP is rate-limited (~3/hr) — not suitable for production. The `send-email` Edge Function exists but the provider needs verification.

**What:**
- Confirm Resend (or equivalent) is the SMTP provider
- Test: invite email, magic link email, payment confirmation
- All three must send and render correctly

---

### Item 24: Full production end-to-end smoke test
**Priority:** CRITICAL  
**Time:** 1 hr  
**Who:** 🔍 You — Manual QA in Production

**Why:** The final gating check before announcing to users. Everything has been built — confirm it all works together in production.

**What:** With a real email, in **production** (not local):
1. Sign up as landlord
2. Add property
3. Invite tenant
4. Tenant accepts
5. Log rent
6. Generate receipt
7. Upgrade to paid
8. Confirm in Stripe Dashboard
9. Sign out → sign back in

---

### Item 25: Review Privacy Policy and Terms of Service content
**Priority:** CRITICAL  
**Time:** Variable  
**Who:** ⚖️ You — Legal Review

**Why:** Both pages are live and public. Generic boilerplate is a legal liability. Must accurately cover data collection, Stripe payments, account deletion, GDPR/CCPA.

**What:** Read both pages. Confirm content is accurate and complete. Engage legal reviewer if needed.

---

## 📊 Progress Summary

| Sprint | Items | Complete | Remaining | Est. Time |
|--------|-------|----------|-----------|-----------|
| 0 — Blockers | 6 | 1 | 5 | ~2 hrs |
| 1 — Brand & Identity | 5 | 0 | 5 | ~2 hrs |
| 2 — Reliability & UX | 8 | **8** | **0** | — |
| 3 — GTM Hardening | 6 | 0 | 6 | ~3 hrs |
| **Total** | **25** | **9** | **16** | **~7 hrs** |

*Sprint 2 completed April 2026 (Items 14, 16, 19 shipped in code; finish Item 14/19 manual deploy secrets as needed).*

---

## 🎯 Critical Path to Launch

**Must Complete Before Launch:**
1. Sprint 0: All items (~2 hrs)
2. ~~Sprint 2: Items 14, 16~~ — **done** (verify in production)
3. Sprint 3: Items 21, 24, 25 (~2 hrs+)

**Total Critical Path (remaining):** roughly **Sprint 0 + Sprint 3** critical items; see Sprint 0 and Sprint 3 sections above.

---

## 📞 Support

**Questions?** Reference these docs:
- Settings Audit: `SETTINGS_AUDIT_ITEM14.md`
- Empty State Audit: `EMPTY_STATE_AUDIT.md`
- Item 14 Handoff: `CURSOR_HANDOFF_ITEM14.md`

**P2 CTO available for:**
- Architecture questions
- Implementation guidance
- Blocker resolution
- Code review
