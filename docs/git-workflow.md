# Git Workflow — uhome

## Overview

uhome uses a **three-branch Git workflow** to separate development, pre-production testing, and production deployments.

## Branch Strategy

```
main (production)
  ↑
develop (pre-production / staging)
  ↑
feature/* (feature branches)
  ↑
release/* (optional, release candidates)
```

### Branch Descriptions

#### `main` Branch
- **Purpose:** Production-only code
- **Database:** Connected to production Supabase database
- **Deployment:** Automatic deployment to production on push
- **Protection:** Requires PR, CI pass, and review
- **Merges:** Only from `develop` branch (after pre-prod testing)

#### `develop` Branch
- **Purpose:** Pre-production / staging environment
- **Database:** Connected to staging Supabase database
- **Deployment:** Automatic deployment to staging on push
- **Protection:** Requires PR and CI pass
- **Merges:** From `feature/*` branches for integration testing

#### `feature/*` Branches
- **Purpose:** Individual feature development
- **Database:** Uses staging database for testing
- **Deployment:** No automatic deployment
- **Merges:** Into `develop` for integration testing

#### `release/*` Branches (Optional)
- **Purpose:** Grouped features for release candidates
- **Database:** Uses staging database
- **Deployment:** No automatic deployment
- **Merges:** Into `develop` for testing, then `develop` → `main` for production

## Workflow

### 1. Feature Development

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Develop and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-feature
# Create PR: feature/my-feature → develop
```

### 2. Pre-Production Testing

```bash
# After PR is merged to develop
git checkout develop
git pull origin develop

# develop branch automatically:
# - Runs CI/CD
# - Deploys to staging
# - Records deployment in Releases tab
# - Runs E2E tests
# - Runs visual UAT
```

### 3. Production Release

```bash
# After all pre-prod tests pass
# Create PR: develop → main

# After PR is merged to main
git checkout main
git pull origin main

# main branch automatically:
# - Runs CI/CD
# - Deploys to production
# - Records deployment in Releases tab
# - Runs production smoke tests
```

## Environment Configuration

### Staging Environment

**Database:**
- Separate Supabase project for staging
- All migrations run on staging database
- Test data seeded (different from production)

**Environment Variables:**
- `VITE_SUPABASE_STAGING_URL`
- `VITE_SUPABASE_STAGING_ANON_KEY`
- `STRIPE_TEST_SECRET_KEY` (for sandbox)
- `POSTAL_STAGING_SMTP_HOST` (for sandbox)

**Deployment:**
- Separate hosting target (e.g., `staging.uhome.app`)
- Connected to staging Supabase

### Production Environment

**Database:**
- Production Supabase project
- Production data only

**Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY` (production)
- `POSTAL_SMTP_HOST` (production)

**Deployment:**
- Production hosting (e.g., `uhome.app`)
- Connected to production Supabase

## CI/CD Integration

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop`
- PRs to `main` or `develop`

**Checks:**
- Linting
- Formatting
- Type checking
- Build verification
- Visual tests (if applicable)

**Environment:**
- Uses staging credentials for `develop` branch
- Uses production credentials for `main` branch

### Staging Deployment (`.github/workflows/staging-deploy.yml`)

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Actions:**
- Runs E2E tests against staging
- Builds application
- Records deployment in Releases tab
- Deploys to staging hosting

### Production Deployment (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` branch (after develop → main merge)
- Manual workflow dispatch

**Actions:**
- Verifies merge came from develop branch
- Runs production smoke tests
- Builds application with production credentials
- Records deployment in Releases tab (`environment='production'`)
- Deploys to production hosting platform

**Status Checks:**
- `verify-branch-source` - Ensures merge came from develop
- `production-smoke-tests` - Critical E2E tests against production
- `deploy` - Production deployment

**Note:** See `docs/git-workflow-setup.md` for detailed branch protection configuration.

---

## Branch Protection Rules

**For `main` branch:**
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass (CI, E2E tests, smoke tests)
- ✅ Require branches to be up to date
- ✅ Require conversation resolution
- ✅ Block force pushes
- ✅ Block deletions

**For `develop` branch:**
- ✅ Require status checks to pass (CI, E2E tests)
- ✅ Require branches to be up to date
- ✅ Block force pushes
- ✅ Block deletions

**Configuration:** See `docs/git-workflow-setup.md` for step-by-step setup instructions.

## Pre-Production Testing

### E2E Tests

```bash
# Run against staging
npm run test:e2e:headless
```

**Tests:**
- All critical user flows
- Authentication flows
- Property management
- Tenant management
- Messaging
- Must pass before merge to `main`

### Visual UAT

```bash
# Run against staging
npm run test:visual:headless
```

**Tests:**
- Visual regression testing
- Compare against baseline snapshots
- Update snapshots if intentional changes

### Stripe Sandbox

- Use Stripe test mode keys
- Test payment flows without real charges
- Verify webhook handling

### Postal Sandbox

- Use staging Postal server
- Test email delivery without sending to real users
- Verify webhook handling

### Sys Admin Rollback Testing

- Test rollback functionality in staging
- Verify feature flag toggles
- Test release tracking

## Release Process

### 1. Feature Complete

- All features merged to `develop`
- All tests passing
- Staging deployment successful

### 2. Pre-Production Testing

- E2E tests pass
- Visual UAT pass
- Stripe sandbox tests pass
- Postal sandbox tests pass
- Sys Admin rollback tested

### 3. Release Candidate

- Create PR: `develop` → `main`
- Review and approve
- Merge to `main`

### 4. Production Deployment

- Automatic deployment triggered
- Deployment recorded in Releases tab
- Production smoke tests run
- Monitor for issues

### 5. Rollback (if needed)

- Use Sys Admin → Releases tab
- Click "Rollback" on problematic release
- Feature flags automatically disabled
- Config reverted
- Event logged in audit trail

## Branch Protection Rules

### `main` Branch

**Required:**
- PR required (no direct pushes)
- CI must pass
- At least 1 review required
- No force pushes
- No branch deletion

### `develop` Branch

**Required:**
- PR required (no direct pushes)
- CI must pass
- No force pushes

## Manual Steps

### Initial Setup

1. **Create `develop` branch:**
   ```bash
   git checkout main
   git checkout -b develop
   git push origin develop
   ```

2. **Create staging Supabase project:**
   - Create new Supabase project
   - Run all migrations
   - Seed with test data
   - Configure RLS policies

3. **Configure GitHub Secrets:**
   - `VITE_SUPABASE_STAGING_URL`
   - `VITE_SUPABASE_STAGING_ANON_KEY`
   - `STRIPE_TEST_SECRET_KEY`
   - `POSTAL_STAGING_SMTP_HOST`

4. **Set up staging deployment target:**
   - Configure hosting platform for staging
   - Connect to staging Supabase
   - Set up staging domain

5. **Configure branch protection:**
   - Set protection rules for `main` and `develop`
   - Require PRs and CI pass

## Troubleshooting

### Staging Tests Failing

- Check staging database is up to date
- Verify staging environment variables
- Check test data is seeded correctly

### Production Deployment Failing

- Verify all pre-prod tests passed
- Check production environment variables
- Review deployment logs

### Merge Conflicts

- Resolve conflicts in feature branch
- Rebase on latest `develop` or `main`
- Test locally before pushing

## Best Practices

1. **Always test in staging first** - Never merge directly to `main`
2. **Keep `develop` stable** - Only merge tested features
3. **Use feature flags** - Enable features gradually
4. **Monitor releases** - Use Releases tab to track deployments
5. **Document changes** - Add release notes for each deployment
