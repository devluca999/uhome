# Deployment Pipeline

> Last updated: 2026-03-22 by P2

## 1. Branch Strategy

| Branch | Purpose | Protected | Direct Push |
|--------|---------|-----------|-------------|
| `main` | Production source of truth | Yes | Never |
| `develop` | Staging integration branch | Yes | Never |
| `feature/*` | Feature development | No | Yes |
| `fix/*` | Bug fixes | No | Yes |
| `hotfix/*` | Urgent production fixes | No | Yes (fast-track) |

**Flow:**
```
feature/* or fix/*
  └─► develop (PR + CI required)
        └─► main (PR + CI required, squash merge)
```

**Hotfix flow:**
```
hotfix/*
  └─► main (PR + CI required)
        └─► develop (back-merge immediately after)
```

**Rules:**
- All merges to `develop` and `main` require a passing PR with CI green
- Squash-merge to `main` to keep history clean
- Delete branches after merge
- No direct commits to `develop` or `main`

## 2. Environment Strategy

| Environment | Purpose | Audience | Data |
|-------------|---------|----------|------|
| Local | Development, unit + E2E tests | Developer only | Docker Supabase, seeded fixtures |
| Staging | QA, integration testing, previews | Internal team | Staging Supabase project, test data |
| Production | Live product | Real users | Production Supabase project, real data |

**Principles:**
- Local uses Docker Supabase CLI — no cloud dependencies for dev
- Staging mirrors production config as closely as possible
- Production is sacred — no direct DB access, no manual deploys, no schema changes without migrations
- Env guards in `src/lib/env-safety.ts` prevent seeds/tests from running against production

## 3. Branch → Vercel → Supabase Mapping

| GitHub Branch | Vercel Environment | Supabase Project | URL |
|--------------|-------------------|-----------------|-----|
| `main` | Production | `vtucrtvajbmtedroevlz` (prod) | app.getuhome.app |
| `develop` | Preview / Staging | `uhome-staging` | demo.getuhome.app |
| `feature/*`, `fix/*` | Preview (auto) | `uhome-staging` | auto-generated e.g. uhome-[hash]-aldesigns197-8242s-projects.vercel.app |

**Notes:**
- Feature branch previews share the staging Supabase project
- Preview deployments are auto-created by Vercel on every PR
- Only `main` connects to the production Supabase project
- Vercel env vars are scoped per environment (Production / Preview / Development)

## 4. Deployment Workflow

### Standard Feature Deploy
```
1. Cut branch:        git checkout -b feature/my-feature develop
2. Develop locally:   npm run dev (local Supabase)
3. Test locally:      npm run test:e2e
4. Push + open PR:    PR targets develop
5. CI runs:           lint → type-check → build → E2E → visual
6. Merge to develop:  auto-deploys to Vercel staging
7. QA on staging:     verify on staging URL
8. PR to main:        CI runs again
9. Merge to main:     auto-deploys to Vercel production
10. Smoke tests run:  automated post-deploy verification
```

### Hotfix Deploy
```
1. Cut branch:        git checkout -b hotfix/issue-name main
2. Fix + test locally
3. PR directly to main (CI required)
4. Merge to main:     deploys to production
5. Back-merge:        git merge main into develop immediately
```

### Manual Deploy (emergency only)
- Trigger via GitHub Actions workflow_dispatch on `deploy.yml`
- Requires justification comment on the workflow run
- Must be followed by a post-mortem note in decisions_log.md

## 5. Database Migration Workflow

```
1. Create migration:  supabase migration new <description>
2. Write SQL:         edit file in supabase/migrations/
3. Test locally:      supabase db reset (applies all migrations + seed)
4. Commit with code:  migration file ships in same PR as feature code
5. Staging apply:     supabase db push --project-ref <staging-ref>  (CI or manual)
6. Verify staging:    run npm run verify:rls + smoke check
7. Production apply:  supabase db push --project-ref <prod-ref>  (post-merge, pre-deploy or in deploy workflow)
```

**Hard rules:**
- Never run `supabase db reset` against staging or production
- Never use the Supabase SQL Editor for schema changes — CLI only
- Every schema change requires a migration file — no exceptions
- Destructive changes (DROP, ALTER) require explicit approval comment on PR
- See [docs/database-migrations.md](../docs/database-migrations.md) for full detail

## 6. Rollback Strategy

### Frontend Rollback (Vercel)
- Vercel keeps a full deployment history per environment
- Instant rollback: Vercel dashboard → select previous deployment → Promote to Production
- Target: < 2 minutes to revert a bad frontend deploy
- No code changes required

### Database Rollback
- There is no automatic DB rollback — Postgres migrations are forward-only
- Rollback = write a new forward migration that reverses the change
- For data loss scenarios: restore from Supabase point-in-time backup
- See [docs/backup-recovery.md](../docs/backup-recovery.md) for backup schedule and restore procedure

### Full Incident Rollback Order
```
1. Revert frontend via Vercel dashboard (immediate)
2. Assess whether DB change caused the issue
3. If DB: write compensating migration, apply to production
4. If Edge Function: redeploy previous version via Supabase dashboard
5. Document incident in decisions_log.md
```

## 7. CI/CD Pipeline Structure

### Trigger Map
| Event | Workflow | Jobs |
|-------|---------|------|
| PR to `develop` or `main` | `ci.yml` | lint, type-check, build, E2E (local), visual |
| Push to `develop` | `staging-deploy.yml` | E2E (staging), build, deploy to Vercel staging |
| Push to `main` | `deploy.yml` | build, deploy to Vercel production, smoke tests |
| Manual dispatch | `deploy.yml` | same as push to main |

### CI Job Sequence (`ci.yml`)
```
lint
  └─► type-check
        └─► build
              └─► local-e2e (Docker Supabase)
                    └─► visual-tests
```
- Fail-fast: any job failure stops the pipeline
- All jobs must pass before merge is allowed
- Target total runtime: < 10 minutes

### Secrets Required (GitHub Actions)
| Secret | Used in | Environment |
|--------|---------|-------------|
| `VITE_SUPABASE_URL` | deploy.yml | Production |
| `VITE_SUPABASE_ANON_KEY` | deploy.yml | Production |
| `VITE_SUPABASE_STAGING_URL` | staging-deploy.yml | Staging |
| `VITE_SUPABASE_STAGING_ANON_KEY` | staging-deploy.yml | Staging |
| `SUPABASE_SERVICE_ROLE_KEY` | scripts, edge functions | Production |
| `STRIPE_TEST_SECRET_KEY` | staging only | Staging |
| `VERCEL_TOKEN` | all deploy workflows | Both |

### Related docs
- [docs/ci_cd.md](../docs/ci_cd.md) — full CI narrative
- [docs/release-process.md](../docs/release-process.md) — release checklist
- [docs/smoke-tests.md](../docs/smoke-tests.md) — post-deploy verification
- [docs/monitoring.md](../docs/monitoring.md) — post-deploy observability
