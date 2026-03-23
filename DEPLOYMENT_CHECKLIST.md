# Production Deployment Checklist - Data Scoping Fixes

## Pre-Deployment Verification

### ✅ Code Changes Verified
- [x] property-service.ts - Owner scoping implemented
- [x] tenant-service.ts - Cascading property scoping implemented
- [x] use-tenants.ts - Demo mode handling correct
- [x] use-expenses.ts - Property-based scoping implemented
- [x] TypeScript compilation passes (exit code 0)
- [x] All 49 unit tests pass

### 📋 Manual Testing on Staging (Required Before Production)

#### 1. Authentication States
- [ ] Test logged out state → verify empty data
- [ ] Test admin + tenant-demo → verify empty arrays
- [ ] Test admin + landlord-demo (empty) → verify empty arrays
- [ ] Test admin + landlord-demo (populated) → verify real DB data
- [ ] Test real landlord → verify scoped data only

#### 2. Data Consistency (CRITICAL)
**Set BOTH pages to YEARLY period before comparing**

**Dashboard (Yearly View):**
- [ ] Note total income value: _______
- [ ] Note total expenses value: _______
- [ ] Note tenant count: _______
- [ ] Note property count: _______

**Finances Page (Yearly View):**
- [ ] Income matches Dashboard: _______
- [ ] Expenses match Dashboard: _______
- [ ] Rent records align with tenant count
- [ ] Expense records align with property count

**If values don't match:** Check period dropdowns are both set to "Yearly"

#### 3. Multi-Tenant Isolation
Create two test landlords:
- [ ] Landlord A can only see their properties
- [ ] Landlord A can only see tenants on their properties
- [ ] Landlord A can only see expenses on their properties
- [ ] Landlord B's data is invisible to Landlord A
- [ ] Vice versa verification

#### 4. Demo Mode Behavior
- [ ] Admin demo mode blocks tenant creation
- [ ] Admin demo mode blocks tenant updates
- [ ] Admin demo mode blocks tenant deletion
- [ ] Admin demo mode blocks tenant unlinking
- [ ] Real user mutations work normally

#### 5. Edge Cases
- [ ] New user (zero properties) shows graceful empty state
- [ ] Delete all properties → tenants/expenses clear correctly
- [ ] Add first property → can add tenants/expenses
- [ ] Property detail page validates ownership

### 🔍 Files Changed (Review Before Deploy)

**Service Layer:**
1. `src/lib/data/property-service.ts` - Owner scoping
2. `src/lib/data/tenant-service.ts` - Property-based tenant scoping

**Hooks Layer:**
3. `src/hooks/use-tenants.ts` - Demo handling + scoped fetch
4. `src/hooks/use-expenses.ts` - Property-based expense scoping

**No UI changes** - All changes are data-layer only

### ⚠️ CRITICAL: Production Deployment Exclusions

**DO NOT include demo-only features:**
- [ ] Verify `VITE_TENANT_DEV_MODE_ENABLED` is NOT in production .env
- [ ] Verify `VITE_LANDLORD_DEV_MODE_ENABLED` is NOT in production .env
- [ ] Verify `SUPABASE_ENV=local` is NOT in production .env
- [ ] Verify production uses cloud Supabase URL
- [ ] Verify `VITE_ENVIRONMENT=production`

**Production .env should ONLY contain:**
```
VITE_SUPABASE_URL=https://vtucrtvajbmtedroevlz.supabase.co
VITE_SUPABASE_ANON_KEY=<production_anon_key>
VITE_ENVIRONMENT=production
```

---

## Deployment Steps

### 1. Final Pre-Flight Checks
```bash
cd C:\Users\user\Documents\GitHub\haume

# Ensure working tree is clean
git status

# Run type check
npx tsc --noEmit

# Run unit tests
npm run test:unit

# Verify build succeeds
npm run build
```

### 2. Merge to Main Branch
```bash
# From develop branch
git checkout develop
git pull origin develop

# Merge to main
git checkout main
git pull origin main
git merge develop

# Push to main (triggers production deployment)
git push origin main
```

### 3. Post-Deployment Verification

**Wait for deployment to complete, then test production:**

- [ ] Login as real landlord
- [ ] Verify Dashboard shows only YOUR properties
- [ ] Verify Finances shows only YOUR expenses
- [ ] Verify Tenants shows only YOUR property tenants
- [ ] Compare Dashboard vs Finances (both yearly) - values match
- [ ] Test create/update/delete operations work
- [ ] Check browser console for errors
- [ ] Verify demo mode NOT accessible in production

### 4. Rollback Plan (If Issues Found)

**Option A: Immediate Rollback**
```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

**Option B: Revert Specific Files**
```bash
git checkout HEAD~1 src/lib/data/property-service.ts
git checkout HEAD~1 src/lib/data/tenant-service.ts
git checkout HEAD~1 src/hooks/use-tenants.ts
git checkout HEAD~1 src/hooks/use-expenses.ts
git commit -m "Rollback: Revert data scoping changes"
git push origin main
```

---

## Success Criteria

### ✅ Deployment Successful When:
1. All 4 scoping functions work correctly
2. Dashboard and Finances data match (same period)
3. Multi-tenant isolation verified
4. No console errors
5. Demo mode features excluded from production
6. Real landlords see only their data

### ❌ Rollback If:
1. Data leakage between landlords
2. Dashboard/Finances mismatch persists
3. Any scoping query returns wrong data
4. Demo mode features appear in production
5. Critical errors in browser console

---

## Monitoring Post-Deploy

**Check these within first 24 hours:**
- [ ] Error rate in Sentry (if configured)
- [ ] User reports of missing/wrong data
- [ ] Database query performance (check slow queries)
- [ ] Authentication failures
- [ ] RLS policy violations in Supabase logs

---

## Notes

**Changes Summary:**
- All data now scoped to authenticated user's ownership
- Properties filtered by `owner_id`
- Tenants filtered by properties user owns
- Expenses filtered by properties user owns
- Demo modes return empty data correctly
- Mutations blocked in demo mode

**Testing Completed:**
- ✅ TypeScript compilation
- ✅ 49 unit tests passing
- ⏳ Manual QA on staging (in progress)
- ⏳ Production smoke tests (after deploy)
