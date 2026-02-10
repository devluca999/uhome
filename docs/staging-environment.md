# Staging Environment Setup — uhome

## Overview

The staging environment is a pre-production environment used for integration testing, E2E tests, visual UAT, and Sys Admin rollback testing before merging to production.

## Staging Supabase Setup

### 1. Create Staging Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `uhome-staging` (or similar)
4. Region: Same as production (for consistency)
5. Database password: Generate strong password
6. Wait for project creation

### 2. Run Migrations

1. Go to SQL Editor in staging project
2. Run all migrations in order:
   - `supabase/schema.sql` (base schema)
   - All files in `supabase/migrations/` (in order)
3. Verify all tables created:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

### 3. Configure RLS Policies

- RLS policies are created by migrations
- Verify policies are active:
  ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

### 4. Seed Test Data

- Use `scripts/seed-mock-data.ts` or similar
- Create test users (landlord, tenant)
- Create test properties, leases, messages
- Mark test data with `is_test = true` flag (if applicable)

### 5. Configure Storage

- Create storage buckets (same as production)
- Configure RLS policies for storage
- Test file uploads

## Environment Variables

### GitHub Secrets

Add to GitHub repository secrets:

```
VITE_SUPABASE_STAGING_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_STAGING_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-key (for Edge Functions)
STRIPE_TEST_SECRET_KEY=sk_test_... (Stripe test mode)
POSTAL_STAGING_SMTP_HOST=staging.postal.yourdomain.com
```

### Local Development

Create `.env.staging.local`:

```bash
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_SUPABASE_STAGING_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_STAGING_ANON_KEY=your-staging-anon-key
```

## Staging Deployment

### Hosting Platform

Set up separate deployment target:

- **Vercel:** Create new project for staging
- **Netlify:** Create new site for staging
- **Cloudflare Pages:** Create new project for staging

### Domain

- Use subdomain: `staging.uhome.app` or `uhome-staging.vercel.app`
- Configure DNS if using custom domain

### Environment Variables

Set in hosting platform:

```
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
```

## Testing in Staging

### E2E Tests

```bash
# Run against staging
VITE_SUPABASE_URL=$VITE_SUPABASE_STAGING_URL \
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_STAGING_ANON_KEY \
npm run test:e2e:headless
```

### Visual UAT

```bash
# Run against staging
VITE_SUPABASE_URL=$VITE_SUPABASE_STAGING_URL \
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_STAGING_ANON_KEY \
npm run test:visual:headless
```

### Manual Testing

1. Visit staging URL
2. Test all features
3. Verify data persists
4. Test rollback functionality
5. Test feature flags

## Staging vs Production Differences

| Feature | Staging | Production |
|---------|---------|------------|
| Database | Separate Supabase project | Production Supabase |
| Data | Test data | Real user data |
| Stripe | Test mode | Live mode |
| Postal | Staging server | Production server |
| Rate Limits | Higher (for testing) | Production limits |
| Domain | `staging.uhome.app` | `uhome.app` |
| Releases | Tracked with `environment='staging'` | Tracked with `environment='production'` |

## Maintenance

### Regular Tasks

1. **Keep migrations in sync** - Run all migrations on staging before production
2. **Refresh test data** - Periodically reset test data
3. **Monitor usage** - Check staging database usage
4. **Update secrets** - Keep environment variables up to date

### Cleanup

- Periodically clean up old test data
- Archive old test users
- Clear old test files from storage

## Troubleshooting

### Staging Database Out of Sync

```bash
# Run all migrations on staging
# Check migration status
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

### Staging Deployment Failing

- Check GitHub Actions logs
- Verify environment variables
- Check staging database is accessible
- Verify hosting platform configuration

### Tests Failing in Staging

- Verify test data exists
- Check RLS policies allow test operations
- Verify environment variables are set
- Check staging database is up to date
