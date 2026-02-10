# Git Workflow Setup Guide

This guide explains how to configure the Git workflow enforcement for uhome.

## Overview

The workflow enforces:
- ✅ Feature branches → `develop` (staging)
- ✅ `develop` → `main` (production)
- ✅ Tests must pass before merge
- ✅ No direct pushes to `main`

## Step 1: Configure GitHub Branch Protection Rules

### For `main` Branch

1. Go to: **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Configure:
   - ✅ **Require a pull request before merging**
     - Require approvals: `1`
     - Dismiss stale pull request approvals when new commits are pushed
     - Require review from Code Owners (if you have CODEOWNERS file)
   - ✅ **Require status checks to pass before merging**
     - Required checks:
       - `lint-and-build`
       - `e2e-tests` (if PR to main)
       - `visual-tests`
       - `production-smoke-tests`
     - Require branches to be up to date before merging
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings**
   - ✅ **Restrict pushes that create files larger than 100MB**
   - ✅ **Block force pushes**
   - ✅ **Block deletions**

### For `develop` Branch

1. Go to: **Settings → Branches → Add rule**
2. Branch name pattern: `develop`
3. Configure:
   - ✅ **Require a pull request before merging**
     - Require approvals: `0` (or `1` if you want reviews)
   - ✅ **Require status checks to pass before merging**
     - Required checks:
       - `lint-and-build`
       - `e2e-tests`
       - `visual-tests`
     - Require branches to be up to date before merging
   - ✅ **Block force pushes**
   - ✅ **Block deletions**

## Step 2: Verify Workflow Files

The following workflow files should be in place:

- ✅ `.github/workflows/ci.yml` - Runs on all PRs and pushes
- ✅ `.github/workflows/staging-deploy.yml` - Deploys `develop` to staging
- ✅ `.github/workflows/deploy.yml` - Deploys `main` to production
- ✅ `.github/pull_request_template.md` - PR template

## Step 3: Test the Workflow

### Test Feature → Develop Flow

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/test-workflow

# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: workflow enforcement"
git push origin feature/test-workflow
```

1. Create PR: `feature/test-workflow` → `develop`
2. Verify CI runs and shows:
   - ✅ `lint-and-build` passes
   - ✅ `e2e-tests` runs (if applicable)
   - ✅ `visual-tests` runs
3. Merge PR
4. Verify `develop` branch:
   - ✅ Auto-deploys to staging
   - ✅ E2E tests run and must pass
   - ✅ Deployment recorded

### Test Develop → Main Flow

```bash
# After develop has changes
git checkout develop
git pull origin develop
git checkout -b release/test-production
git push origin release/test-production
```

1. Create PR: `develop` → `main`
2. Verify CI runs and shows:
   - ✅ `lint-and-build` passes
   - ✅ `e2e-tests` runs
   - ✅ `visual-tests` runs
3. After merge, verify `main` branch:
   - ✅ `verify-branch-source` runs
   - ✅ `production-smoke-tests` runs and must pass
   - ✅ Auto-deploys to production
   - ✅ Deployment recorded

## Step 4: Verify Direct Push Prevention

Try to push directly to `main` (should be blocked):

```bash
git checkout main
git pull origin main
# Make a change
echo "# Direct push test" >> README.md
git add README.md
git commit -m "test: direct push"
git push origin main
```

**Expected:** GitHub should reject the push if branch protection is configured correctly.

## Workflow Summary

### Feature Development
```
feature/my-feature
  ↓ (PR + CI must pass)
develop (staging)
  ↓ (Auto-deploy + E2E must pass)
  ↓ (PR + CI + Review)
main (production)
  ↓ (Auto-deploy + Smoke tests)
```

### Required Status Checks

**For PRs to `develop`:**
- `lint-and-build`
- `e2e-tests` (if applicable)
- `visual-tests`

**For PRs to `main`:**
- `lint-and-build`
- `e2e-tests`
- `visual-tests`
- `production-smoke-tests`
- `verify-branch-source`

## Troubleshooting

### CI Not Running
- Check that workflow files are in `.github/workflows/`
- Verify branch protection rules are configured
- Check GitHub Actions tab for errors

### Tests Failing
- Run tests locally: `npm run test:e2e:headless`
- Check test environment variables in GitHub Secrets
- Verify staging database is accessible

### Deployment Not Triggering
- Verify branch name matches workflow trigger (`develop` or `main`)
- Check GitHub Actions logs for errors
- Verify deployment secrets are configured

## Next Steps

After setup:
1. ✅ All feature work goes through `feature/*` → `develop`
2. ✅ All production releases go through `develop` → `main`
3. ✅ Tests must pass before merge
4. ✅ Staging is automatically deployed and tested
5. ✅ Production is protected and requires review
