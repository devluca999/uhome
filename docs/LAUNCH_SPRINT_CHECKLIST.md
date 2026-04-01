# uhome — Launch Sprint Checklist
> Generated: March 25, 2026 | P2 CTO Audit  
> **How to use:** Work through sprints in order. Do not start Sprint 1 until Sprint 0 is complete.

---

## Label Key

| Label | Meaning |
|-------|---------|
| 🤖 `P2 can automate` | I (Claude/P2) can write the code or file directly in this session |
| 🖥️ `Cursor` | Write/edit code — do in Cursor with P2 guiding |
| 🔧 `You — Dashboard/Config` | Requires you to act in an external dashboard (Stripe, Supabase, Vercel, Google, GitHub) |
| 🔍 `You — QA/Manual` | Requires you to manually test or review |
| ⚖️ `You — Legal/Content` | Requires human judgment, legal review, or content writing |

---

## Sprint 0 — Blockers
> Nothing else works until these are done.

### 1. Wire `organizationId` into AuthContext
- **Why:** `auth-context.tsx` has `organizationId: null` hardcoded. `useSubscription` queries by org ID — without it, billing gates permanently return the free plan for every user. Feature limits, collaborator caps, and plan enforcement are all broken silently.
- **What:** After role resolves, query `organization_members` table for the user's org ID and set it in context.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 30 min`

### 2. Build `create-checkout-session` Edge Function
- **Why:** The entire billing funnel is blocked at this one missing function. `handleSelect` in `subscription-plans.tsx` is currently a `console.log`.
- **What:** Create `supabase/functions/create-checkout-session/index.ts`. Wire it into `subscription-plans.tsx`. Add `trial_period_days: 30` to the checkout session call. Full implementation already drafted in `STRIPE_INTEGRATION_ASSESSMENT.md`.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 30 min`

### 3. Fix price display mismatch — $29 vs $29.99
- **Why:** `plans.ts` has `monthlyPrice: 2900` (Landlord) and `monthlyPrice: 5900` (Portfolio) but Stripe has `2999` and `5999`. The UI shows the wrong price.
- **What:** Update `src/lib/stripe/plans.ts` — Landlord monthly to `2999`, Portfolio monthly to `5999`.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 5 min`

### 4. Register Stripe subscription webhook endpoint
- **Why:** The webhook handler Edge Function exists and is correct, but the endpoint is not registered in Stripe Dashboard — so no subscription lifecycle events are processed.
- **What:** Stripe Dashboard → Developers → Webhooks → Add endpoint. URL: `https://[your-project].supabase.co/functions/v1/stripe-subscription-webhook`. Copy signing secret → add as `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` in Supabase Edge Function secrets.
- **Labels:** 🔧 `You — Stripe Dashboard · 15 min` · 🔧 `You — Supabase Dashboard · 5 min`

### 5. Fix Google OAuth — Supabase + Google Cloud config
- **Why:** Google sign-in is broken. The callback URL mismatch between Google Cloud Console and Supabase is the root cause. AuthCallback race condition was already fixed in the audit session.
- **What:**
  1. Google Cloud Console → Credentials → OAuth Client → Authorized Redirect URIs → add: `https://[project-ref].supabase.co/auth/v1/callback`
  2. Google Cloud Console → Authorized JavaScript Origins → add: `https://app.getuhome.app`
  3. Supabase Dashboard → Authentication → URL Configuration → Site URL: `https://app.getuhome.app`
  4. Supabase → Redirect URLs → add: `https://app.getuhome.app/auth/callback`
  5. Supabase → Providers → Google → confirm Client ID + Secret are filled in
- **Labels:** 🔧 `You — Google Cloud Console · 10 min` · 🔧 `You — Supabase Dashboard · 10 min`

### 6. Add role selection step for Google OAuth signups
- **Why:** A user who signs up via Google bypasses the Landlord/Tenant role toggle — they land with `role: null`, get redirected nowhere, and cannot use the app. Silent failure.
- **What:** Add a post-OAuth role selection screen that fires when a new Google user has no role assigned. Default to landlord with an option to switch before proceeding.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 45 min`

---

## Sprint 1 — Brand & Identity
> Before the first real user sees the app.

### 7. Replace sage green accent with slate/steel
- **Why:** Sage green (`--primary: 142 20% 58%`) is still the active accent color across the entire app. The brand direction has moved to a cooler slate/steel palette to complement the chrome house aesthetic.
- **What:** Update `--primary` HSL token in `src/index.css`. Suggested value: `hsl(215, 15%, 55%)` — cool blue-grey. All `text-primary`, `bg-primary`, `border-primary`, and `ring` update automatically.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 15 min`

### 8. Add premium typeface — Geist or DM Sans
- **Why:** The app currently uses the system font stack. At this level of UI polish, typography is the weakest element. A considered typeface elevates the entire product.
- **What:** Add to `index.html` via Google Fonts CDN or Fontsource npm package. Override `font-family` in `index.css` body. Recommendation: **Geist** (technical-premium, free from Vercel) or **DM Sans** (warmer, editorial feel).
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 10 min`

### 9. Create SVG version of the chrome house logo
- **Why:** The 1MB PNG (`applogo/chromehome3.png`) does not scale cleanly at nav/favicon sizes. An SVG is needed for: nav bar, login/signup header (currently loading `/logo.png`), browser favicon, and PWA manifest icons.
- **What:** Produce a clean SVG redraw of the chrome house. Replace `public/logo.png`. Update favicon references in `index.html`.
- **Labels:** 🖥️ `Cursor · 45 min`

### 10. Tighten `home.tsx` — minimal on-brand fallback page
- **Why:** The current home page (three icon feature cards) is shown when users access the app URL directly. It doesn't need to sell the product — `getuhome.app` does that — but it should feel intentional and branded, not like a placeholder.
- **What:** Replace feature cards with: chrome house logo + one-line tagline + Sign In / Get Started buttons. Clean, centered, on-brand. No feature descriptions.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 30 min`

### 11. Wire login CTA on getuhome.app → app.getuhome.app
- **Why:** The marketing site and the app are currently disconnected. Users who arrive at `getuhome.app` have no path into the actual product.
- **What:** In the Lovable editor, update all Sign In / Get Started CTAs to point to `https://app.getuhome.app/login` and `https://app.getuhome.app/signup`. DNS is already configured in Vercel.
- **Labels:** 🔧 `You — Lovable editor · 15 min`

---

## Sprint 2 — Reliability & UX Polish
> Real users expect these. Gaps here cause churn.

### 12. New landlord onboarding — first-run experience
- **Why:** A landlord who signs up cold lands on an empty dashboard with no guidance. The `use-onboarding` hook exists but no UI is wired. Empty screens without prompts read as broken.
- **What:** For new landlords with zero properties: replace the empty dashboard sections with a prompt card — "Add your first property to get started" with a primary CTA. Optionally: pre-load demo data with a dismissible banner.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 1 hr`

### 13. Empty-state audit across all feature panels
- **Why:** MVP scope states "empty screens are failures." Every panel — Properties, Tenants, Finances, Operations, Documents, Messages, Maintenance — needs a helpful empty state with a clear action, not a blank surface.
- **What:** Walk every landlord and tenant page with a fresh account. Log every blank panel. Fix each one with a message + primary action CTA.
- **Labels:** 🔍 `You — QA walkthrough · 1 hr` · 🖥️ `Cursor for each fix`

### 14. Add Stripe Customer Portal for self-serve billing management
- **Why:** Users cannot currently cancel, upgrade, or update their payment method from within the app. This is a legal requirement in most jurisdictions and a basic user expectation.
- **What:** Create `supabase/functions/create-portal-session/index.ts`. Add a "Manage billing" button in Settings that calls it and redirects to Stripe's hosted portal. Stripe handles all UI.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 45 min`

### 15. Add trial status UI to billing section
- **Why:** Users in their 30-day trial need to know how long they have. `subscription.status === 'trialing'` is in the type system but there is no UI for it — users have no visibility into their trial period.
- **What:** In the billing/settings section, when `status === 'trialing'`, show: "Your trial ends on [date]. Upgrade to keep access." with a direct upgrade CTA.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 30 min`

### 16. Plan gate enforcement audit
- **Why:** Now that `organizationId` will be wired (Sprint 0 item 1), verify that `canAddProperty()`, `canAddCollaborator()`, and `hasFeature()` are actually called at every gate in the UI. Free users hitting a limit should see a friendly upgrade prompt — not an error, and not silently succeed.
- **What:** Check: adding a property on free plan (limit 1), inviting a collaborator, accessing advanced financials. Each gate should show an upgrade modal or prompt.
- **Labels:** 🖥️ `Cursor · 1 hr` · 🔍 `You — QA test`

### 17. Confirm Sentry DSN is configured in production
- **Why:** `@sentry/react` is in dependencies but does nothing without the DSN env var. Errors in production are currently silent — you have no visibility into what's breaking for real users.
- **What:** Vercel Dashboard → Project → Settings → Environment Variables → confirm `VITE_SENTRY_DSN` is set for Production. If not set: create a Sentry project, get the DSN, add it.
- **Labels:** 🔧 `You — Vercel Dashboard · 10 min`

### 18. Verify `dist/` is gitignored and not committed
- **Why:** `dist/` appears in the repo directory listing. Build output should never be committed — it inflates repo size, creates merge conflicts, and causes confusion about what is source vs artifact.
- **What:** Confirm `/dist` is in `.gitignore`. If `dist/` is tracked: `git rm -r --cached dist/` then commit.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 5 min`

### 19. Wire Vercel deploy into GitHub Actions (CI gate)
- **Why:** Currently `deploy.yml` ends with `echo "Deployment steps would be added here"`. Vercel deploys independently via GitHub integration — a broken build can deploy to production before CI fails.
- **What:** Add `amondnet/vercel-action` to `deploy.yml`. Requires adding `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as GitHub repository secrets. Disable Vercel's GitHub auto-deploy in Vercel project settings.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 30 min` · 🔧 `You — add 3 GitHub secrets + disable Vercel auto-deploy`

---

## Sprint 3 — Go-to-Market Hardening
> For sustained growth and operational safety post-launch.

### 20. Add Dependabot for automated security patches
- **Why:** No `.github/dependabot.yml` exists. The stack (React 18, Vite 7, Playwright, Supabase JS) receives frequent security patches. Without Dependabot, patches require manual monitoring and effort.
- **What:** Create `.github/dependabot.yml` with weekly npm ecosystem updates targeting `develop` branch.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 10 min`

### 21. Set branch protection on `main` in GitHub
- **Why:** `deploy.yml`'s `verify-branch-source` check is a soft warning — it does not block direct pushes to `main`. A mistaken push can deploy to production without CI passing.
- **What:** GitHub → Settings → Branches → Add rule for `main`: require PR before merging, require status checks to pass (CI), block force pushes, no direct pushes.
- **Labels:** 🔧 `You — GitHub Settings · 5 min`

### 22. Verify receipt PDF branding — free vs paid tiers
- **Why:** "uhome-branded receipts on free, custom on paid" is a documented feature gate. The `generate-receipt` Edge Function reads `receipt_settings` from DB. Needs a real end-to-end test to confirm free users see uhome branding and paid users can customize.
- **What:** Generate a receipt as a free landlord and as a paid landlord. Confirm PDF output matches the plan's feature gate.
- **Labels:** 🔍 `You — QA test · 30 min`

### 23. Confirm transactional email is configured
- **Why:** The `send-email` Edge Function exists but the email provider configuration needs verification. Supabase's default SMTP has very low rate limits (~3/hr) — not suitable for production.
- **What:** Confirm Resend (or equivalent) is configured as the SMTP provider in Supabase. Test: invite email, magic link email, payment confirmation email. All three should send and render correctly.
- **Labels:** 🔧 `You — Supabase Dashboard · 30 min` · 🖥️ `Cursor if Resend integration needs code`

### 24. Full production end-to-end smoke test
- **Why:** The last gating check before announcing to users. Everything has been built and configured — now confirm it all works together in production with a real email address.
- **What:** Using a personal email (not a demo account): sign up as landlord → add property → invite tenant → tenant accepts invite → landlord logs rent payment → generate receipt → upgrade to Landlord plan → confirm subscription active in Stripe Dashboard → log out → sign back in.
- **Labels:** 🔍 `You — manual QA in production · 1 hr`

### 25. Review Privacy Policy and Terms of Service content ⚠️ Urgent
- **Why:** Both pages are live and publicly accessible at `/privacy` and `/terms`. Generic placeholder or template text is a legal liability. Content must accurately cover: data collection, Stripe payment processing, account deletion rights, GDPR/CCPA. Critically — the T&C must include explicit disclaimers that uhome does not generate, validate, or certify lease agreements, does not provide legal advice, and does not provide tax advice or calculate tax liability. These disclaimers are the primary protection against misuse of future lease template and tax export features.
- **What:** Read both pages. Confirm content is accurate, complete, and not boilerplate. Engage a legal reviewer. Budget $300–500 for a one-time legal review.
- **Labels:** ⚖️ `You — legal review · variable`

### 26. Add expense receipt/invoice attachment 🆕
- **Why:** Landlords currently track expenses in uhome but their supporting documents (invoices, receipts, contractor bills) live in a shoebox or email inbox. Attaching them to the expense record makes uhome the single source of truth and dramatically improves the tax export story.
- **What:** Add a file attachment field to the expense form. Store in Supabase Storage under `expenses/{expense_id}/`. Display as a downloadable link on the expense record. Accepted types: PDF, JPEG, PNG. Max size: 10MB per file.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 2 hrs`

### 27. Lease template storage and reuse 🆕
- **Why:** When renewing a lease, landlords re-upload the same document every year. When onboarding a new tenant into the same property, they need their standard lease again. The fix is document reuse — not generation.
- **What:** Add a "Lease templates" section to the property detail page. A landlord uploads their lease PDF once and tags it to a property. When creating a new lease, they can select "Use existing template" to duplicate the document record and attach it. No AI, no clause generation — pure document storage with a copy/attach workflow.
- **Scope guardrail:** This feature must not be positioned as legal document generation. A UI note should read: "Upload your own lease. uhome stores and organizes your documents — it does not create or validate legal agreements."
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 3 hrs`

### 28. Tax-friendly annual export 🆕
- **Why:** At year-end, landlords need to hand their accountant a summary of rental income and expenses. Currently they'd have to screenshot or manually export from uhome. A structured export removes this friction entirely.
- **What:** Add "Export for tax season" button to the Finances page. Generates a PDF (or CSV) with: property name, total rent collected per property, total expenses by category, net income — all scoped to a selected tax year. Include a footer: "This export is for record-keeping purposes. uhome does not provide tax advice."
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 2 hrs`

### 29. Personal reminders — extend tasks + UI 🆕
- **Why:** Landlords and tenants have no way to set private reminders tied to their property context. "Follow up on lease renewal", "Check insurance", "Remind tenant about late payment" — these are real daily-use cases with no current home in the app.
- **What:** Add `remind_at timestamptz`, `is_personal_reminder boolean default false`, and `reminder_type text` (`lease_expiry | rent_due | custom`) columns to `tasks` table via migration. Add `'self'` to the `TaskAssignedToType` enum. Build a "Set reminder" UI component that appears on: property detail page (landlord), tenant profile (landlord), lease detail page (both roles). In-app delivery only: Supabase realtime subscription checks `remind_at <= now()` and surfaces a notification badge. System-aware automatic reminders (cron for lease expiry/rent due) deferred to Phase 10.
- **Scope guardrail:** Reminder fires, user decides action. uhome does not auto-generate renewal documents or trigger lease workflows.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 3 hrs`

### 30. Documents page redesign 🆕
- **Why:** The current documents page is a flat property-scoped grid with categories hacked into filenames. No hierarchy, no tags, no folders — unusable for landlords managing more than 5-6 documents.
- **What:** New DB migration: `document_folders` table (`id, property_id, name, color, created_by`) + new columns on `documents` (`folder_id, is_starred, tenant_visible, tags text[]`). New page layout: left sidebar (Library, Properties, Tags), folder grid with color-coded cards + `···` context menus, compact file list with type badges + tag pills + context menus. Drag-drop upload zone. Breadcrumb nav. Search. Tenant view: read-only, `tenant_visible = true` files only. "Share with tenant" toggle per file in context menu.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 4 hrs`

### 31. Mobile layout — bottom tabs + sheets + FAB 🆕
- **Why:** Mobile currently renders a desktop sidebar on a phone screen, leaving ~119px for content. Pages are vertical card stacks with no mobile hierarchy. This is the single biggest UX gap for mobile users.
- **What:** New `MobileLayout.tsx` replacing `SidebarLayout` when `isMobile === true` (desktop layout untouched). `BottomTabBar.tsx`: 5 tabs (Home / Properties / Finances / Messages / More). `MobileSheet.tsx`: reusable slide-up sheet utility. Page-level content tabs for Finances (Overview/Ledger/Expenses), Properties, Operations (Tasks/Work Orders). Dashboard reskin: hero card + metric pill row + activity feed. FAB `+` button above tab bar, context-aware sheet per section. All form actions (add property, log rent, submit request, upload doc) open as sheets — user never leaves current screen.
- **Labels:** 🤖 `P2 can automate` · 🖥️ `Cursor · 6 hrs`

---

## Summary

| Sprint | Items | Owner | Est. Time |
|--------|-------|-------|-----------|
| 0 — Blockers | 6 | Mix | ~2.5 hrs |
| 1 — Brand | 5 | Mix | ~2 hrs |
| 2 — Reliability | 11 (8 original + 3 added) | Mix | ~6 hrs |
| 3 — GTM + Features | 11 (5 original + 6 added) | Mix | ~8 hrs |
| **Total** | **33** | | **~18.5 hrs** |

> **Sprint 2 additions (A–C):** Demo populated state fix · Messaging UI redesign · (date range picker deferred Phase 13)
> **Sprint 3 additions:** 26. Expense receipt attachment · 27. Lease template storage · 28. Tax export · 29. Personal reminders · 30. Documents redesign · 31. Mobile layout

> **Legal note:** Item 25 (T&C + Privacy Policy) is urgent — disclaimer language covers items 27, 28, 29, 30.

> **Automated by P2:** Items 1, 2, 3, 6, 7, 8, 10, 12, 14, 15, 18, 19, 20, 26, 27, 28, 29, 30, 31 — 19 of 33 items.
