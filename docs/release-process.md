# Release Process — uhome

## Overview

This document describes the release and deployment process for uhome, including pre-production testing, release candidate preparation, and production deployment.

## Release Workflow

### 1. Feature Development

1. Create feature branch from `develop`
2. Develop and test locally
3. Create PR to `develop`
4. Review and merge

### 2. Pre-Production Testing (Staging)

After merge to `develop`:

1. **Automatic Staging Deployment**
   - CI/CD deploys to staging
   - Deployment recorded in Releases tab (`environment='staging'`)

2. **E2E Tests**
   ```bash
   npm run test:e2e:headless
   ```
   - Run against staging environment
   - All critical flows must pass

3. **Visual UAT**
   ```bash
   npm run test:visual:headless
   ```
   - Visual regression testing
   - Compare against baselines

4. **Stripe Sandbox Testing**
   - Test payment flows
   - Verify webhook handling
   - No real charges

5. **Postal Sandbox Testing**
   - Test email delivery
   - Verify webhook handling
   - No emails to real users

6. **Sys Admin Rollback Testing**
   - Test rollback functionality
   - Verify feature flag toggles
   - Test release tracking

### 3. Release Candidate

After all pre-prod tests pass:

1. **Create Release PR**
   - PR: `develop` → `main`
   - Include release notes
   - Tag with version number (e.g., `v1.2.3`)

2. **Review and Approve**
   - Code review
   - Verify all tests passed
   - Check release notes

3. **Merge to Main**
   - Merge PR
   - Tag release (optional)
   - Create GitHub release (optional)

### 4. Production Deployment

After merge to `main`:

1. **Automatic Production Deployment**
   - CI/CD deploys to production
   - Deployment recorded in Releases tab (`environment='production'`)

2. **Production Smoke Tests**
   - Verify deployment successful
   - Check critical endpoints
   - Monitor error rates

3. **Monitor**
   - Watch error logs
   - Monitor performance
   - Check user feedback

### 5. Rollback (if needed)

If issues detected:

1. **Go to Sys Admin → Releases**
2. **Select problematic release**
3. **Click "Rollback"**
4. **Confirm rollback**
   - Feature flags disabled
   - Config reverted
   - Event logged

## Release Versioning

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features (backwards compatible)
- **PATCH:** Bug fixes

### Examples

- `1.0.0` - Initial release
- `1.1.0` - New features added
- `1.1.1` - Bug fixes
- `2.0.0` - Breaking changes

### Release Codenames (Optional)

- `v1.0.0` - "Phoenix"
- `v1.1.0` - "Aurora"
- `v1.2.0` - "Nova"

## Release Notes

### Format

```markdown
## Version 1.2.3 - "Nova"

### Features
- Added tenant view modes (list/card)
- Implemented messaging entry points
- Added email notifications

### Improvements
- Improved tenant detail modal
- Enhanced messaging deep linking

### Bug Fixes
- Fixed tenant filtering issue
- Resolved message thread loading

### Breaking Changes
- None
```

### Where to Add

- GitHub release description
- Releases tab in Sys Admin
- `CHANGELOG.md` (if maintained)

## Deployment Recording

### Automatic Recording

Deployments are automatically recorded via:

1. **CI/CD Webhook** (future)
   - Calls `record-deployment` Edge Function
   - Includes commit hash, version, environment

2. **Manual Entry** (current)
   - Admin creates release record in Releases tab
   - Includes version, codename, release notes

### Release Record Fields

- `version` - Semantic version
- `codename` - Optional release name
- `commit_hash` - Git commit hash
- `deployed_at` - Deployment timestamp
- `deployed_by` - Admin user ID
- `status` - 'active', 'rolled_back', 'pending', 'superseded'
- `release_notes` - Markdown release notes
- `environment` - 'staging' or 'production'
- `is_active` - Only one active release per environment

## Pre-Production Checklist

Before merging `develop` → `main`:

- [ ] All E2E tests pass
- [ ] Visual UAT passes
- [ ] Stripe sandbox tests pass
- [ ] Postal sandbox tests pass
- [ ] Sys Admin rollback tested
- [ ] Release notes written
- [ ] Version number determined
- [ ] Code review completed
- [ ] All feature flags tested
- [ ] Database migrations tested

## Production Checklist

After merge to `main`:

- [ ] Deployment successful
- [ ] Production smoke tests pass
- [ ] Error rates normal
- [ ] Performance metrics normal
- [ ] User feedback monitored
- [ ] Release record created
- [ ] Feature flags enabled (if applicable)

## Rollback Procedure

### When to Rollback

- Critical bugs discovered
- Performance degradation
- Security issues
- Data corruption

### How to Rollback

1. **Go to Sys Admin → Releases**
2. **Select release to rollback**
3. **Click "Rollback" button**
4. **Review warnings:**
   - Active users affected
   - Database migrations required
   - Git/infrastructure redeploy needed
5. **Confirm rollback:**
   - Feature flags disabled
   - Config reverted
   - Event logged

### Rollback Limitations

- **Cannot rollback database migrations** - Manual intervention required
- **Cannot rollback Git changes** - Requires Git revert
- **Cannot rollback infrastructure changes** - Manual intervention required

### Post-Rollback

1. **Investigate issue**
2. **Fix in feature branch**
3. **Re-test in staging**
4. **Re-deploy to production**

## Release Candidates (Optional)

For grouped features:

1. **Create release branch:**
   ```bash
   git checkout develop
   git checkout -b release/v1.2.0
   ```

2. **Merge features:**
   ```bash
   git merge feature/feature1
   git merge feature/feature2
   ```

3. **Test release candidate:**
   - Merge to `develop`
   - Run pre-prod tests
   - Fix issues

4. **Release:**
   - Merge `develop` → `main`
   - Tag release
   - Deploy to production

## Best Practices

1. **Test thoroughly in staging** - Never skip pre-prod tests
2. **Use feature flags** - Enable features gradually
3. **Monitor after deployment** - Watch for issues
4. **Document releases** - Clear release notes
5. **Plan rollbacks** - Know how to rollback before deploying
6. **Version consistently** - Follow semantic versioning
7. **Tag releases** - Use Git tags for releases
