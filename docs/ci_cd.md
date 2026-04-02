# CI/CD Setup — uhome

## Overview

uhome uses GitHub Actions for continuous integration and deployment. The setup supports both staging (`develop` branch) and production (`main` branch) environments.

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop` branches

**Checks:**
1. **Linting**: ESLint validation
2. **Formatting**: Prettier validation (no auto-fix)
3. **Type Checking**: TypeScript compiler check
4. **Build**: Production build verification
5. **E2E (Local Supabase)**: Primary - runs `npm run db:start`, `npm run db:reset`, `seed:demo`, then Playwright E2E
6. **E2E (Cloud Staging)**: Legacy - temporary parallel run during transition; remove after 2 consecutive green local runs
7. **Visual Tests**: Visual regression testing

**Local Supabase (primary):**
- `local-e2e` job starts Docker Supabase, applies migrations, seeds demo data, runs E2E
- No cloud staging required for CI success
- See [Local Testing](local-testing.md)

**Environment:**
- Uses staging credentials for `develop` branch (visual/legacy E2E)
- Uses production credentials for `main` branch

**Behavior:**
- Fail-fast on errors
- All checks must pass before merge
- Fast feedback loop

### Staging Deployment (`.github/workflows/staging-deploy.yml`)

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Actions:**
- Runs E2E tests against staging
- Builds application with staging credentials
- Records deployment in Releases tab (`environment='staging'`)
- Deploys to staging hosting platform

### Production Deployment (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` branch (after develop → main merge)
- Manual workflow dispatch

**Actions:**
- Verifies merge source (soft check)
- Runs production smoke tests (local Supabase + Playwright)
- Builds application with production credentials
- Deploys to **Vercel** via `amondnet/vercel-action` (`--prod`) when secrets are set
- Records deployment placeholder / artifacts

**Vercel (production job):** GitHub secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Prefer disabling Vercel’s duplicate Git-based production deploy if this workflow owns releases.

## Environment Variables in CI/CD

**Secrets Management:**
- All secrets stored in GitHub Secrets
- Never expose in workflow logs
- Only `NEXT_PUBLIC_*` variables in workflow (safe for public)

**Required Secrets:**

**Production:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for Edge Functions)
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (for `deploy.yml` production deploy)
- `VITE_SUPABASE_STAGING_URL` (deploy workflow guard: must differ from production URL)

**Staging:**
- `VITE_SUPABASE_STAGING_URL`
- `VITE_SUPABASE_STAGING_ANON_KEY`
- `STRIPE_TEST_SECRET_KEY` (for sandbox)
- `POSTAL_STAGING_SMTP_HOST` (for sandbox)

## Local Development

**Pre-commit and pre-push:** Follow **[PRE_COMMIT_CHECKLIST.md](./PRE_COMMIT_CHECKLIST.md)** — typecheck, lint, and **update launch docs** (`LAUNCH_SPRINT_CHECKLIST.md`, `SESSION_SUMMARY.md`, etc.) when sprint status changes.

**Also useful before a large change:**
- `npm run format`
- `npm run build`

## Adding New Checks

To add new CI checks:
1. Add script to `package.json`
2. Add step to `.github/workflows/ci.yml`
3. Test locally first
4. Ensure checks run quickly (< 5 min total)

## Troubleshooting

**CI Failing:**
- Check error output in GitHub Actions tab
- Run failing command locally
- Fix errors and push again

**Build Failing:**
- Verify all environment variables are set in GitHub Secrets
- Check TypeScript errors
- Verify dependencies are installed

