# Quick Apply Guide

## 🎯 3 Simple Steps

### 1. Open Production SQL Editor
Go to: https://supabase.com/dashboard/project/vtucrtvajbmtedroevlz/sql

### 2. Copy & Run This SQL
Open `PRODUCTION_SCHEMA_SYNC.sql` and copy all contents → Paste in SQL Editor → Click "Run"

### 3. Verify It Worked
```bash
npx tsx scripts/verify-schema-congruence.ts
```

Should see: ✅ SCHEMAS ARE CONGRUENT

---

## 📋 What Happens
- Adds 35 missing columns across 5 tables
- Enables image uploads in production
- Syncs production with staging
- Takes ~30 seconds

## ✅ Safe to Run
- Uses `IF NOT EXISTS` everywhere
- No data loss
- Can run multiple times
- All changes are additive

---

**That's it!** After this, production and staging will be identical. 🎉
