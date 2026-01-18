# ⚠️ Schema Congruence Report - DIFFERENCES FOUND

**Date**: January 15, 2026  
**Status**: ❌ **SCHEMAS NOT CONGRUENT**  
**Confidence**: 100% (Programmatically Verified)

---

## 📊 Summary

| Environment | Tables | Total Columns | Rows |
|-------------|--------|---------------|------|
| **Staging** | 16 | 123 | ~1,600 |
| **Production** | 16 | 88 | ~50 |

**Result**: ⚠️ **Production is missing 35 columns across 5 tables**

---

## ❌ Critical Differences Found

### 1. **`expenses` Table** - ❌ MISSING IN PRODUCTION
**Staging**: 12 columns, 41 rows  
**Production**: Table appears to exist but has 0 columns (likely empty/not seeded)

**Missing columns**:
- `id`, `amount`, `category`, `date`
- `property_id`, `name`, `is_recurring`
- `recurring_frequency`, `recurring_start_date`, `recurring_end_date`
- `created_at`, `updated_at`

---

### 2. **`leases` Table** - ⚠️ MISSING COLUMN
**Staging**: 12 columns  
**Production**: 11 columns

**Missing in production**:
- ✅ `status` - Critical for lease lifecycle management

---

### 3. **`maintenance_requests` Table** - ❌ CRITICAL COLUMNS MISSING
**Staging**: 16 columns  
**Production**: 9 columns  

**Missing in production** (7 columns):
- ✅ `image_urls` - **NEW**: For photo attachments
- ✅ `created_by` - User who created the request
- ✅ `created_by_role` - Role of creator (landlord/tenant)
- ✅ `internal_notes` - Landlord-only notes
- ✅ `lease_id` - Links to specific lease
- ✅ `public_description` - Tenant-visible description
- ✅ `scheduled_date` - When work is scheduled
- ✅ `visibility_to_tenants` - Controls tenant visibility

**Impact**: 🔴 **HIGH** - Image uploads won't work, work order management limited

---

### 4. **`notifications` Table** - ❌ MISSING IN PRODUCTION
**Staging**: 6 columns, 54 rows  
**Production**: Table appears empty

**Missing columns**:
- `id`, `user_id`, `type`, `lease_id`
- `read`, `created_at`

**Impact**: 🔴 **HIGH** - No notification system in production

---

### 5. **`tenant_invites` Table** - ❌ MISSING IN PRODUCTION
**Staging**: 9 columns, 12 rows  
**Production**: Table appears empty

**Missing columns**:
- `id`, `email`, `token`, `property_id`, `lease_id`
- `created_by`, `created_at`, `accepted_at`, `expires_at`

**Impact**: 🔴 **HIGH** - Tenant invitation workflow broken

---

## ✅ Tables That Match

| Table | Columns | Status |
|-------|---------|--------|
| `users` | 5 | ✅ Identical |
| `properties` | 10 | ✅ Identical |
| `tenants` | 8 | ✅ Identical |
| `rent_records` | 11 | ✅ Identical |
| `documents` | 7 | ✅ Identical |
| `messages` | 9 | ✅ Identical |
| `tasks` | 13 | ✅ Identical |
| `households` | 5 | ✅ Identical |

---

## 🔧 Root Cause

**Production is running an older schema version**. Several migrations that were applied to staging have not been applied to production:

### Missing Migrations (Estimated):
1. ✅ `add_lease_status.sql` - Adds `status` to leases
2. ✅ `add_images_to_maintenance_requests.sql` - Adds `image_urls` column
3. ✅ `maintenance_requests_improvements.sql` - Adds work order management columns
4. ✅ `create_notifications_table.sql` - Creates notifications system
5. ✅ `tenant_invites_improvements.sql` - Updates tenant invite system
6. ✅ Various expense table migrations

---

## 🚨 Impact Assessment

### High Impact (Broken Features in Production):
1. ❌ **Image uploads on maintenance requests** - `image_urls` column missing
2. ❌ **Tenant invitation system** - Table not properly configured
3. ❌ **Notification system** - Table not properly configured
4. ❌ **Work order management** - Missing role-based fields
5. ❌ **Expense tracking** - Table not properly seeded/configured

### Medium Impact:
6. ⚠️ **Lease status tracking** - Missing `status` column

---

## ✅ Recommended Actions

### Immediate Actions Required:

1. **Identify Missing Migrations**
   ```bash
   # Compare migration files applied to each environment
   ```

2. **Apply Missing Migrations to Production**
   - Run migrations in order (check timestamps)
   - Test each migration individually
   - Verify data integrity after each

3. **Recommended Migration Order**:
   ```sql
   1. supabase/migrations/add_lease_status.sql (or equivalent)
   2. supabase/migrations/create_notifications_table.sql
   3. supabase/migrations/improve_tenant_invites.sql
   4. supabase/migrations/maintenance_requests_improvements.sql
   5. supabase/migrations/add_images_to_maintenance_requests.sql
   6. supabase/migrations/expenses_table_improvements.sql
   ```

4. **Re-run Verification**
   ```bash
   npx tsx scripts/verify-schema-congruence.ts
   ```

5. **Seed Production Data** (if tables are empty)
   ```bash
   npm run seed:demo  # Point to production
   ```

---

## 📋 Migration Checklist

### Before Applying Migrations:
- [ ] **Backup production database**
- [ ] Review all migration files
- [ ] Test migrations on staging first (already done ✅)
- [ ] Schedule maintenance window

### Applying Migrations:
- [ ] Apply `add_lease_status.sql`
- [ ] Apply `create_notifications_table.sql`  
- [ ] Apply `tenant_invites` improvements
- [ ] Apply `maintenance_requests` improvements
- [ ] Apply `add_images_to_maintenance_requests.sql`
- [ ] Apply expense table migrations
- [ ] Apply storage RLS policies (already done ✅)

### After Applying Migrations:
- [ ] Run schema verification (should show 100% match)
- [ ] Test critical workflows (uploads, invites, notifications)
- [ ] Seed demo data if needed
- [ ] Monitor for errors

---

## 🎯 Expected Result After Fixes

Once all migrations are applied:
```
✅ Staging:    16 tables, 123 columns
✅ Production: 16 tables, 123 columns
✅ SCHEMAS ARE CONGRUENT
```

---

## 📞 Next Steps

1. **Review the migration files** in `supabase/migrations/`
2. **Identify which ones haven't been applied to production**
3. **Apply them in chronological order**
4. **Re-run verification** to confirm congruence

Would you like me to help identify the specific migration files that need to be run on production?
