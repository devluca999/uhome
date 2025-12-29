# CI/CD Setup — uhome

## Overview

uhome uses GitHub Actions for continuous integration and deployment. The setup is minimal and focused on quality checks.

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Pull requests
- Pushes to main branch

**Checks:**
1. **Linting**: ESLint validation
2. **Formatting**: Prettier validation (no auto-fix)
3. **Type Checking**: TypeScript compiler check
4. **Build**: Production build verification
5. **Audit**: Security audit (npm audit)

**Behavior:**
- Fail-fast on errors
- All checks must pass before merge
- Fast feedback loop

### Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to main branch (after CI passes)
- Manual trigger option

**Actions:**
- Validates environment variables are set
- Deploys to production hosting platform
- Verifies deployment success

## Environment Variables in CI/CD

**Secrets Management:**
- All secrets stored in GitHub Secrets
- Never expose in workflow logs
- Only `NEXT_PUBLIC_*` variables in workflow (safe for public)

**Required Secrets:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional, for server-side operations if needed)

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

