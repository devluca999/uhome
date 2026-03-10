# Seed Scripts — uhome

## Production-Realistic Demo Data Seeding

### Quick Start

```bash
npm run seed:demo
```

**⚠️ STAGING ONLY** - This script hard-fails if run against production.

### What It Does

The production demo seed script creates comprehensive, production-realistic demo data for staging testing:

- **1 Demo Landlord** user account (`demo-landlord@uhome.internal`)
- **12+ Tenant** user accounts (including `demo-tenant@uhome.internal`)
- **5 Properties** with varied rent amounts ($1,200 - $3,500) and due dates
- **12+ Tenant-lease pairs** created via real invite flow (validates invite logic)
- **100+ Rent records** distributed across 12 months with realistic payment statuses
- **50+ Expenses** across multiple categories distributed across 12 months
- **15+ Work orders** (bidirectional: tenant and landlord created) with various statuses
- **50+ Messages** across lease-scoped threads with back-and-forth conversations

This creates a comprehensive dataset for power-user testing, E2E validation, and visual UAT.

### Test Credentials

After running the seed script, you can log in with:

**Landlord:**
- Email: `demo-landlord@uhome.internal`
- Password: `DemoLandlord2024!`

**Tenant:**
- Email: `demo-tenant@uhome.internal`
- Password: `DemoTenant2024!`

**Admin:**
- Email: `admin@uhome.internal`
- Password: `DemoAdmin2024!`

### Requirements

- **Required:** `VITE_SUPABASE_URL` in `.env.local` (must point to staging)
- **Required:** `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (for staging seeding)
- **Required:** `VITE_SUPABASE_ANON_KEY` in `.env.local` (for user creation)

The script includes a hard safety guard (`enforceStagingOnly()`) that will fail immediately if production is detected.

### Notes

- The script is idempotent - safe to re-run (checks for existing data)
- Demo tenant is created via real invite flow (no shortcuts) - validates invite logic
- All work orders are lease-scoped
- All messages are lease-scoped (one thread per lease)
- Rent records include late fees and varied payment statuses
- Expenses are distributed across properties and months

### Safety

- **Hard-fails on production** - Uses `enforceStagingOnly()` guard
- **Staging-only execution** - Cannot run against production database
- **Idempotent** - Safe to re-run multiple times

## Mock Data Seeding

### Quick Start

```bash
npm run seed:mock
```

### What It Does

The seed script creates realistic mock data for testing and development, simulating an **active power user account**:

- **1 Landlord** user account
- **3 Tenant** user accounts  
- **3 Properties** with varied rent amounts and details
- **3 Tenant assignments** (one tenant per property)
- **36 Rent records** (12 months × 3 tenants) with:
  - Variety in payment dates (early, on-time, late)
  - Mix of payment methods (Zelle, Cash, Check, Venmo, Bank Transfer)
  - Realistic status distribution (paid, pending, overdue)
- **15-20 Expense records** across 12 months with:
  - Multiple categories (maintenance, utilities, repairs, insurance, taxes)
  - Realistic amounts ($50-$700 range)
  - Some recurring expenses
- **5+ Maintenance requests** in various states (pending, in_progress, completed)
- **3 Sample documents** (lease agreements, guidelines)
- **10+ Notes** (2-3 per property, plus notes on rent records and expenses)

This creates a comprehensive dataset that demonstrates the full potential of the application with realistic, varied data that shows scale, momentum, and trust.

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
- The seed script creates a **power user account** with 12 months of historical data to demonstrate the app's full capabilities
- Mock data is designed to feel realistic and show the app in active use, not as an empty demo

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

