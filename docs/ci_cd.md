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
5. **E2E (Local Supabase)**: Primary - runs `supabase start`, `db reset`, seed, then Playwright E2E
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
- Builds application with production credentials
- Records deployment in Releases tab (`environment='production'`)
- Deploys to production hosting platform
- Runs production smoke tests

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

**Staging:**
- `VITE_SUPABASE_STAGING_URL`
- `VITE_SUPABASE_STAGING_ANON_KEY`
- `STRIPE_TEST_SECRET_KEY` (for sandbox)
- `POSTAL_STAGING_SMTP_HOST` (for sandbox)

## Local Development

**Pre-commit:**
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code
- Run `npm run type-check` to verify types
- Run `npm run build` to verify build succeeds

**Recommended:**
- Use husky for git hooks (optional, not required for MVP)
- Or run checks manually before pushing

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

