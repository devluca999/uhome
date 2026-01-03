# Staging Supabase Setup for E2E Tests

## ⚠️ CRITICAL: Database Schema Must Be Set Up

Your staging Supabase instance needs the complete database schema before tests can run.

## Step 1: Set Up Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your **staging project** (`vdrbnwxuyzvbeygxjyjw`)
3. Navigate to: **SQL Editor**
4. Open the file `supabase/schema.sql` from this project
5. Copy **ALL** the SQL (entire file)
6. Paste into Supabase SQL Editor
7. Click **Run** (or press Ctrl+Enter)

This creates all tables, RLS policies, indexes, and triggers needed for uhome.

## Step 2: Disable Email Confirmation (REQUIRED)

1. In Supabase Dashboard → Your staging project
2. Navigate to: **Authentication** → **Providers** → **Email**
3. Find **"Enable email confirmations"** toggle
4. **Turn it OFF** (disable email confirmations)
5. Save changes

**Why:** Tests create users with fake email addresses. If email confirmation is enabled:
- Emails are sent to fake addresses
- Emails bounce (addresses don't exist)
- Account gets restricted/suspended
- Tests fail with rate limit errors

## Step 3: Verify Schema Is Set Up

After running the schema, verify these tables exist:
- `public.users`
- `public.properties`
- `public.tenants`
- `public.rent_records`
- `public.maintenance_requests`
- `public.property_groups`
- `public.property_group_assignments`
- And other tables from schema.sql

You can check by running a simple query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## Step 4: Run Tests

After both steps are complete:
```bash
npm run test:e2e
```

## Troubleshooting

### Error: "Could not find the table 'public.users' in the schema cache"
- **Solution:** Run `supabase/schema.sql` in SQL Editor (Step 1 above)

### Error: "Request rate limit reached" or "email rate limit exceeded"
- **Solution:** Disable email confirmation (Step 2 above)
- Wait 24-48 hours if account was restricted

### Error: "Account restricted"
- **Solution:** Disable email confirmation immediately
- Wait for restrictions to clear
- Contact Supabase support if restrictions persist

## Notes

- This setup is for your **test/staging** Supabase instance only
- Your production instance should have email confirmation enabled
- The schema should match your production database structure

