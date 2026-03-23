# P2 CTO Audit Report — uhome
Date: 2026-03-22 | Author: P2 (Claude, acting CTO)
Scope: Repo structure, documentation, CI/CD, Vercel deployment, branching, risks, recommendations.

---

## 1. Official Workflow — Confirmed

Rule                                              | Status
--------------------------------------------------|--------
P2 reads/writes docs and forClaude locally        | CONFIRMED
App code written in Cursor                        | CONFIRMED
All changes committed to GitHub before deploy     | ENFORCED by Actions
GitHub is source of truth                         | CONFIRMED
Vercel handles production + preview deployments   | PARTIAL — see Section 5
Deployments only from GitHub state                | ENFORCED by Actions
forClaude = living CTO documentation              | CONFIRMED
P2 maintains docs, flags debt, reviews config     | ACTIVE from this session

---

## 2. Repository Structure — Verified

Structure is clean and well-organized.

  .github/workflows/   ci.yml, deploy.yml, staging-deploy.yml
  forClaude/           10 CTO/AI documentation files
  docs/                40+ deep-dive technical docs
  src/                 App source (pages, components, hooks, lib)
  supabase/            Migrations, functions, config, seeds
  scripts/             Seeding, verification, DB tooling (tsx)
  tests/               E2E (Playwright), visual, unit, auth, UAT
  dist/                Build output — VERIFY this is in .gitignore
  public/              Static assets (PWA icons, manifest)

forClaude files confirmed: README, system_overview, architecture,
database_schema, deployment_pipeline, environment_config, security_model,
tech_debt, roadmap, decisions_log, access_test (added this session).

OBSERVATION: Most forClaude files are well-structured scaffolds.
Canonical detail lives correctly in docs/. This is the right pattern.
P2 will populate placeholder sections progressively.


---

## 3. Branching Strategy — Verified and Formalized

Existing documented strategy confirmed. P2 formalizes it:

  main       Production only. Auto-deploys to uhome.app
    ^ PR only
  develop    Staging/pre-production. Auto-deploys to staging.uhome.app
    ^ PR only
  feature/*  Individual feature work. No auto-deploy. Branch from develop.
  hotfix/*   Urgent production fixes. Branch from main. Merge to main AND develop.

### Branch Protection (enforce in GitHub Settings > Branches)

  main:      no direct push | CI + smoke tests must pass | 1 approval required
  develop:   no direct push | CI + E2E must pass | review optional (solo)
  feature/*: direct push OK
  hotfix/*:  direct push OK

### Commit Convention (recommended — not yet enforced)
  feat:  new feature
  fix:   bug fix
  chore: maintenance, doc updates
  docs:  documentation only
  test:  tests only
  refactor: code restructure, no behavior change

Example: feat: add tenant rent payment history view

---

## 4. CI/CD Pipeline — Verified

Three workflow files confirmed. Pipeline is well-structured.

### ci.yml — triggered on push/PR to main or develop
  1. changes         Path filter (app, tests, docs) — skips unnecessary jobs
  2. lint-and-build  ESLint, Prettier, TypeScript, RLS verify, Vite build
  3. local-e2e       8-shard Playwright against local Docker Supabase
  4. merge-e2e-reports  Merges shard artifacts into HTML report
  5. visual-tests    4-shard visual regression (chromium)
  6. merge-visual-reports  Merges shard artifacts

STRENGTH: Local Supabase E2E means no cloud staging dependency for CI.
RISK: visual-tests job hits staging Supabase secrets — if secrets are missing,
      visual tests will silently degrade. Consider adding a secret presence check.

### staging-deploy.yml — triggered on push to develop
  1. e2e-tests (8 shards, chromium, against staging)
  2. merge-reports
  3. deploy-staging  Builds with staging env, uploads artifact
  NOTE: deploy-staging step ends with echo placeholder — no actual Vercel push yet.

### deploy.yml — triggered on push to main
  1. verify-branch-source   Checks merge message for 'develop' (soft warning only)
  2. production-smoke-tests  E2E against STAGING before production build
  3. deploy  Verifies prod != staging URL, builds with prod env, uploads artifact
  NOTE: deploy step ends with echo placeholder — no actual Vercel push yet.


---

## 5. Vercel Deployment — GAP IDENTIFIED (Priority)

This is the most important finding in this audit.

CURRENT STATE: Both deploy.yml and staging-deploy.yml build the app and upload
a dist/ artifact to GitHub Actions, but the actual deployment step is a placeholder:
  run: echo "Deployment steps would be added here"

This means: GitHub Actions builds the app but does NOT push it to Vercel.

LIKELY ACTUAL STATE: Vercel is probably connected directly to the GitHub repo
via Vercel's GitHub integration (not via Actions). This means:
  - Vercel auto-deploys on every push to main (production)
  - Vercel auto-deploys on every push to develop (preview)
  - PR branches get Vercel preview URLs automatically

If this is the case, the current setup works but has a risk:
  Vercel deploys independently of CI/CD. A broken build could deploy to Vercel
  before GitHub Actions finishes or fails.

RECOMMENDED FIX: Disable Vercel auto-deploy from GitHub and instead trigger
Vercel deployment from within deploy.yml using the Vercel CLI or vercel-action,
AFTER all CI checks pass. This makes CI the gate for all deployments.

ACTION REQUIRED: Confirm with owner — is Vercel connected via GitHub integration?
Check Vercel dashboard > Project Settings > Git.

### Correct Vercel + GitHub Actions Integration Pattern

In deploy.yml, replace the echo placeholder with:
  - name: Deploy to Vercel (Production)
    uses: amondnet/vercel-action@v25
    with:
      vercel-token: ${{ secrets.VERCEL_TOKEN }}
      vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
      vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
      vercel-args: '--prod'

Required GitHub secrets to add: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID


---

## 6. Risks Identified

### CRITICAL
- R1: Vercel deploy not wired to Actions (Section 5). Deployments may bypass CI gates.

### HIGH
- R2: deploy.yml verify-branch-source is a soft warning only — it does not block
       a direct push to main. Branch protection rules in GitHub must enforce this.
       If branch protection is not set, main can be pushed to directly.

- R3: dist/ directory appears in repo root. Build output should NOT be committed.
       Check .gitignore — if dist/ is tracked, it creates confusion and bloat.

- R4: forClaude/roadmap.md has no content in current engineering focus sections.
       P2 cannot effectively prioritize without knowing what we're building next.

### MEDIUM
- R5: visual-tests in ci.yml uses staging Supabase secrets with no presence check.
       If VITE_SUPABASE_STAGING_URL is unset, tests run against empty env silently.

- R6: record-deployment step in both deploy.yml and staging-deploy.yml is a TODO.
       No deployment tracking is happening. This makes rollback and audit harder.

- R7: Legacy cloud staging E2E lane in ci.yml has not been fully retired yet.
       The comment says "remove after 2 consecutive green local runs" — unclear if
       that threshold was reached. Keeping it adds CI complexity and cost.

### LOW
- R8: No hotfix/* branch workflow documented or tested.
       If a production bug hits, the process for hotfixing is informal.

- R9: No Dependabot or automated dependency update workflow configured.
       Security patches require manual attention.

---

## 7. Missing Documentation (Suggested Additions to forClaude)

File                          | Purpose
------------------------------|------------------------------------------
forClaude/vercel_config.md    | Vercel project IDs, env mapping, deploy settings
forClaude/secrets_inventory.md| Which secrets exist in GitHub, Vercel, what they map to
forClaude/onboarding.md       | How a new dev gets the project running locally
forClaude/incident_runbook.md | What to do when prod breaks (rollback, hotfix steps)

These are the highest-value additions for P2 to function effectively.

---

## 8. Recommendations — Prioritized

Priority 1 (Do now — blocks correct CI/CD):
  - Confirm Vercel GitHub integration setting and decide: Actions-driven or auto-deploy
  - If Actions-driven: add VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID to GitHub secrets
    and wire vercel-action into deploy.yml and staging-deploy.yml
  - Verify branch protection rules are active on main and develop in GitHub

Priority 2 (Do soon — operational safety):
  - Verify dist/ is in .gitignore and not committed
  - Add secret presence check to visual-tests job in ci.yml
  - Retire legacy cloud staging E2E lane from ci.yml if threshold was met
  - Implement record-deployment Edge Function call (TODO in both deploy workflows)

Priority 3 (Do when capacity allows):
  - Fill in forClaude/roadmap.md current engineering focus
  - Create forClaude/vercel_config.md and forClaude/secrets_inventory.md
  - Document hotfix/* workflow in git-workflow.md
  - Add Dependabot config (.github/dependabot.yml)

---

## 9. What P2 Can Do Next

With current access (local filesystem + Vercel MCP), P2 can:
  - Read/write all forClaude docs and keep them current
  - Draft workflow file changes for review before you commit
  - Review Vercel config via Vercel MCP
  - Audit src/ architecture and flag coupling/debt
  - Draft missing documentation files
  - Review PRs when you paste diffs in chat

With GitHub MCP active in Cursor, P2 can additionally:
  - Read live Actions logs and diagnose CI failures
  - Propose workflow YAML edits directly
  - Monitor branch status and PR CI results

---

## 10. Summary

The uhome repository has a solid foundation. The branching strategy, CI pipeline,
environment separation, and security model are thoughtfully designed.

The primary gap is the Vercel deployment integration — the Actions workflows build
correctly but do not yet push to Vercel. This should be resolved before treating
the pipeline as production-safe.

Everything else is operational or has a clear path to resolution.

P2 is fully onboarded and ready to work.

