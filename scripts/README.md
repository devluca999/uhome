# Seed Scripts — uhome

## Mock Data Seeding

### Quick Start

```bash
npm run seed:mock
```

### What It Does

The seed script creates realistic mock data for testing and development:

- **1 Landlord** user account
- **3 Tenant** user accounts  
- **3 Properties** with varied rent amounts and details
- **3 Tenant assignments** (one tenant per property)
- **9 Rent records** (3 months × 3 tenants) with mixed statuses (paid, pending)
- **5 Maintenance requests** in various states (pending, in_progress, completed)
- **3 Sample documents** (lease agreements, guidelines)

### Test Credentials

After running the seed script, you can log in with:

**Landlord:**
- Email: `landlord@example.com`
- Password: `password123`

**Tenants:**
- Email: `tenant1@example.com` / Password: `password123`
- Email: `tenant2@example.com` / Password: `password123`
- Email: `tenant3@example.com` / Password: `password123`

### Requirements

- **Required:** `VITE_SUPABASE_URL` in `.env.local`
- **Recommended:** `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (for full access)

If using service role key, the script will automatically create users.
If using anon key only, you need to be logged in first (the script will use your current user).

### Notes

- The script checks for existing properties to avoid duplicates
- If properties already exist, it skips creation
- To re-seed fresh data, delete existing properties first (this will cascade delete related data)
- All created users use the password: `password123`

### Troubleshooting

**Error: "Missing Supabase environment variables"**
- Ensure `.env.local` exists with `VITE_SUPABASE_URL` set

**Error: "Not authenticated"** (when using anon key)
- Log in to the app first, or add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

**Duplicate key errors**
- Delete existing properties/data in Supabase Dashboard or via SQL

### Clearing Mock Data

To clear all seeded data, run this in Supabase SQL Editor:

```sql
-- Clear all seeded data (keeps users)
DELETE FROM public.maintenance_requests;
DELETE FROM public.rent_records;
DELETE FROM public.documents;
DELETE FROM public.tenants;
DELETE FROM public.properties;
```

Or delete via the app UI (delete properties, which cascades to related data).

