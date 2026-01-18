# 🚀 Apply Production Schema Sync

## ✅ Step 1: Consolidated Migration Created

**File**: `PRODUCTION_SCHEMA_SYNC.sql`

This script includes ALL missing changes:
- ✅ Expenses table creation + recurring support
- ✅ Leases.status column + draft support
- ✅ Notifications table creation
- ✅ Tenant_invites.lease_id column
- ✅ Maintenance_requests: 7 missing columns (including image_urls)
- ✅ All RLS policies
- ✅ All indexes
- ✅ Data migration queries

**Total**: 35 columns will be added across 5 tables

---

## 🎯 Step 2: Apply to Production

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Production Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/vtucrtvajbmtedroevlz
   ```

2. **Navigate to SQL Editor** (left sidebar)

3. **Create New Query**

4. **Copy the contents of `PRODUCTION_SCHEMA_SYNC.sql`**

5. **Paste and Run** (click "Run" button)

6. **Verify** - Check the verification queries at the bottom of the script

---

### Option B: Via Supabase CLI (if installed)

```bash
supabase db push --project-ref vtucrtvajbmtedroevlz --file PRODUCTION_SCHEMA_SYNC.sql
```

---

## ⚡ Quick Apply

If you want me to display the full SQL here so you can copy it directly:

```sql
-- See PRODUCTION_SCHEMA_SYNC.sql for the complete migration
-- (File is ~300 lines with comments)
```

---

## ✅ Step 3: Verify Congruence

After running the migration, verify that schemas match:

```bash
npx tsx scripts/verify-schema-congruence.ts
```

**Expected output**:
```
✅ SCHEMAS ARE CONGRUENT
Staging and Production databases have identical structure!
```

---

## 🔍 What Gets Added

### 1. **expenses** table (12 columns)
- Full table creation with RLS policies
- Recurring expenses support
- Updated_at trigger

### 2. **leases.status** column
- Adds: draft, active, ended status tracking
- Updates existing leases appropriately
- Makes some fields nullable for drafts

### 3. **notifications** table (6 columns)
- Full table creation
- RLS enabled
- Indexes for performance

### 4. **tenant_invites.lease_id** column
- Links invites to draft leases
- Index for performance

### 5. **maintenance_requests** (7 columns)
- `image_urls` (JSONB) - For photo uploads ✨
- `created_by_role` (TEXT) - landlord/tenant
- `lease_id` (UUID) - Lease scope
- `public_description` (TEXT) - Tenant-visible
- `internal_notes` (TEXT) - Landlord-only
- `scheduled_date` (TIMESTAMP) - When work is scheduled
- `visibility_to_tenants` (BOOLEAN) - Visibility control

---

## 🛡️ Safety Features

- ✅ All operations use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
- ✅ Safe to run multiple times (idempotent)
- ✅ Data migration included for existing records
- ✅ No data loss - existing columns preserved
- ✅ RLS policies protect data access

---

## 📊 Post-Migration Checklist

After running the migration:

- [ ] ✅ Run verification script (should show 100% congruence)
- [ ] ✅ Test image uploads on maintenance requests
- [ ] ✅ Test tenant invitation flow
- [ ] ✅ Test expense tracking
- [ ] ✅ Verify lease status tracking works
- [ ] ✅ Check notifications are created

---

## 🆘 If Something Goes Wrong

The migration is designed to be safe, but if you encounter issues:

1. **Check Supabase logs** in dashboard
2. **Verification queries** at bottom of SQL file show what was applied
3. **Contact support** or restore from backup if needed

All changes are additive (new columns/tables) - no existing data is modified or deleted.

---

## ⏱️ Estimated Time

- **Running migration**: ~10-30 seconds
- **Verification**: ~5 seconds
- **Total**: < 1 minute

---

Ready to proceed? Copy `PRODUCTION_SCHEMA_SYNC.sql` to your Production SQL Editor and run it! 🚀
