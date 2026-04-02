# Cursor Task: Seed Staging Database for demo.getuhome.app

## Goal
Populate the staging Supabase database with demo accounts so the user can log into https://demo.getuhome.app with the standard demo credentials.

---

## Context

**Demo credentials (hardcoded in seed script):**
- Landlord: `demo-landlord@uhome.internal` / `DemoLandlord2024!`
- Tenant: `demo-tenant@uhome.internal` / `DemoTenant2024!`
- Admin: `admin@uhome.internal` / `DemoAdmin2024!`

**Problem:** These accounts don't exist in the staging database yet, so login fails with "Invalid login credentials"

**Solution:** Run the demo seed script pointing at staging Supabase

---

## Required Information

To complete this task, you need **3 environment variables** for the staging Supabase instance:

1. `VITE_SUPABASE_URL` - Staging Supabase project URL
2. `VITE_SUPABASE_ANON_KEY` - Staging anon/public key
3. `SUPABASE_SERVICE_ROLE_KEY` - Staging service role key

**Where to find them:**

**Option A - Vercel Dashboard:**
1. Go to Vercel dashboard for the `demo.getuhome.app` project
2. Project Settings → Environment Variables
3. Look for variables with "STAGING" in the name

**Option B - Supabase Dashboard:**
1. Go to Supabase dashboard
2. Select the staging project (not production)
3. Settings → API
4. Copy: Project URL, anon key, service_role key

**Option C - GitHub Secrets:**
1. Repository Settings → Secrets → Actions
2. Look for:
   - `VITE_SUPABASE_STAGING_URL`
   - `VITE_SUPABASE_STAGING_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY_STAGING`

---

## Task Steps

### Step 1: Get Staging Credentials

Ask the user to provide the three staging Supabase credentials listed above.

If user doesn't have them readily available, guide them to one of the locations mentioned.

### Step 2: Set Environment Variables

Once you have the credentials, set them as environment variables:

```powershell
# In PowerShell
$env:VITE_SUPABASE_URL="https://[staging-ref].supabase.co"
$env:VITE_SUPABASE_ANON_KEY="eyJ[anon-key]..."
$env:SUPABASE_SERVICE_ROLE_KEY="eyJ[service-role-key]..."
$env:CONFIRM_STAGING_RESEED="yes"
$env:VITE_ENVIRONMENT="staging"
$env:SUPABASE_ENV="staging"
```

### Step 3: Run Seed Script

```powershell
cd C:\Users\user\Documents\GitHub\haume
npm run seed:demo
```

**Expected output:**
```
✓ Demo landlord created
✓ Demo admin created
✓ Demo tenant created
✓ 5 properties created
✓ Leases created
✓ Demo data seeding complete!

🔑 Demo Credentials:
   Landlord: demo-landlord@uhome.internal / DemoLandlord2024!
   Tenant: demo-tenant@uhome.internal / DemoTenant2024!
```

**Runtime:** 30-60 seconds

### Step 4: Verify in Supabase Dashboard

1. Open Supabase dashboard for staging project
2. Go to Authentication → Users
3. Verify these 3 accounts exist:
   - demo-landlord@uhome.internal (confirmed)
   - demo-tenant@uhome.internal (confirmed)
   - admin@uhome.internal (confirmed)

### Step 5: Test Login

Go to https://demo.getuhome.app and try logging in with:
- Landlord: https://demo.getuhome.app/landlord/login
- Email: `demo-landlord@uhome.internal`
- Password: `DemoLandlord2024!`

Should successfully log in and show the landlord dashboard.

---

## Safety Guardrails (Built-in)

The seed script has multiple safety checks:

✅ **Production block** - Script hard-fails if `SUPABASE_ENV=production`
✅ **Confirmation required** - Needs `CONFIRM_STAGING_RESEED=yes` for remote databases
✅ **Local URL check** - Detects if URL is localhost vs cloud
✅ **Existing user handling** - Deletes and recreates if password doesn't match

**You cannot accidentally seed production** - the script will exit with an error.

---

## Troubleshooting

### Error: "Missing Supabase environment variables"
**Fix:** All 3 variables must be set (URL, anon key, service role key)

### Error: "Refusing to seed a remote database without explicit confirmation"
**Fix:** Set `CONFIRM_STAGING_RESEED=yes`

### Error: "User already exists but cannot authenticate"
**Expected:** Script will automatically delete and recreate the user with correct password

### Script runs but login still fails
**Check:**
1. Verify the staging Supabase URL in Vercel matches the URL you seeded
2. Check that demo.getuhome.app is actually using staging Supabase (not production)
3. Look at Supabase Auth logs for the actual error

---

## What Gets Created

**3 User Accounts:**
- Landlord with full portfolio access
- Tenant with active lease
- Admin with system access

**Sample Data:**
- 5 properties (realistic addresses)
- Active, expired, and pending leases
- Rent payment history
- Maintenance requests
- Household members
- Document placeholders
- Security audit logs

**Total database records:** ~100-200 rows across multiple tables

---

## Expected Outcome

After successful seeding:
1. ✅ 3 demo accounts exist in staging Supabase
2. ✅ User can log into demo.getuhome.app with demo credentials
3. ✅ Dashboard shows realistic sample data
4. ✅ All navigation and features work

---

## Script Location

The seed script is: `scripts/seed-production-demo.ts`

It uses the `createAndConfirmDemoUser()` function which:
1. Signs up user via Supabase auth (proper password hashing)
2. Auto-confirms email (no confirmation email needed)
3. Sets user role (landlord/tenant/admin)
4. Creates associated profile records

This is why the credentials work - they're created through proper auth flow with correct password hashing.

---

## Questions for User

Before starting:
1. "Do you have access to the staging Supabase credentials (URL, anon key, service role key)?"
2. "Can you provide them, or should I guide you to where to find them?"

After seeding:
1. "Try logging into demo.getuhome.app - did it work?"
2. "Do you see the demo data in the dashboard?"

---

## Success Criteria

- [ ] User provides staging Supabase credentials
- [ ] Environment variables set correctly
- [ ] Seed script runs without errors
- [ ] 3 demo accounts visible in Supabase dashboard
- [ ] User successfully logs into demo.getuhome.app
- [ ] Dashboard displays sample data

---

**Time estimate:** 5-10 minutes (depending on how quickly credentials are located)

**Confidence:** High - This is a well-tested script that runs in CI/local environments daily
