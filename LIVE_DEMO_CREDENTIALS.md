# 🌐 Live Demo Credentials for demo.getuhome.app

**URL:** https://demo.getuhome.app

---

## ✅ Same Demo Accounts Work Everywhere

The demo credentials are **universal** across all environments that have been seeded with the demo data script (`npm run seed:demo`).

### 👔 **Landlord Account**
```
Email:    demo-landlord@uhome.internal
Password: DemoLandlord2024!
```

### 🏠 **Tenant Account**
```
Email:    demo-tenant@uhome.internal
Password: DemoTenant2024!
```

### 🔧 **Admin Account**
```
Email:    admin@uhome.internal
Password: DemoAdmin2024!
```

---

## Login URLs for demo.getuhome.app

**Landlord:**
```
https://demo.getuhome.app/landlord/login
```

**Tenant:**
```
https://demo.getuhome.app/tenant/login
```

**Admin:**
```
https://demo.getuhome.app/admin/login
```

---

## ⚠️ Important: Demo Data Must Be Seeded

**These credentials only work if the staging Supabase database has been seeded.**

### To Check if Demo Data Exists

If you get "Invalid login credentials" or "User not found":
1. The staging database hasn't been seeded yet
2. Demo data needs to be created

### To Seed Staging Database

**From your local machine:**
```bash
# Make sure .env or .env.local points to STAGING Supabase
VITE_SUPABASE_URL=<staging-supabase-url>
VITE_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-key>

# Confirm you want to seed staging (safety check)
CONFIRM_STAGING_RESEED=yes npm run seed:demo
```

**This will create:**
- All 3 demo accounts (landlord, tenant, admin)
- 5 sample properties
- Realistic lease data
- Payment history
- Maintenance requests
- Complete portfolio data

---

## Environment Architecture

**Your setup has multiple Supabase instances:**

| Environment | Database | URL |
|-------------|----------|-----|
| Local dev | Local Supabase | http://localhost:3000 |
| Staging | Staging Supabase | https://demo.getuhome.app |
| Production | Production Supabase | (future - different URL) |

**Key point:** demo.getuhome.app uses **staging Supabase**, not production.

---

## Troubleshooting Login Issues

### "Invalid login credentials"

**Cause:** Demo accounts don't exist in staging database

**Solution:**
1. Verify staging Supabase URL in your environment
2. Run: `CONFIRM_STAGING_RESEED=yes npm run seed:demo`
3. Wait for script to complete
4. Try logging in again

### "User not found"

**Same as above** - database needs seeding

### Email confirmation issues

Demo script auto-confirms all demo accounts, so this shouldn't be an issue.

---

## Security Notes

✅ **Safe to share:** These credentials are demo-only and contain no real user data  
✅ **Safe to commit:** These credentials are in the code repository  
❌ **Not for production:** Demo script hard-fails if pointed at production URLs  
✅ **Staging only:** Can only be used on local dev or staging environments

---

## Quick Test

**To verify demo accounts exist in staging:**

```bash
# Using Supabase CLI (if you have staging linked)
npx supabase db dump --schema auth

# Or check in Supabase Dashboard
# Go to: Authentication → Users
# Look for: demo-landlord@uhome.internal, demo-tenant@uhome.internal, admin@uhome.internal
```

---

## Next Steps

**If you can't log in:**
1. Check if you have staging Supabase credentials in `.env`
2. Run the seed script: `CONFIRM_STAGING_RESEED=yes npm run seed:demo`
3. Verify in Supabase Dashboard that users were created
4. Try logging in at https://demo.getuhome.app

**If you still can't log in:**
- The staging deployment might be pointing to a different Supabase instance
- Check Vercel environment variables for `VITE_SUPABASE_URL`
- Make sure it matches the Supabase instance you seeded

---

**Created:** March 23, 2026  
**For:** demo.getuhome.app live preview environment

