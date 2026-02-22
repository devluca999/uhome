# Backup and Recovery — uhome

## Overview

This document describes how to back up and restore the uhome database. Backups should be taken before applying migrations to production.

## Backup Procedures

### Supabase Dashboard (Recommended)

1. Open your Supabase project in the dashboard
2. Go to **Database** → **Backups**
3. Supabase Pro includes daily automated backups
4. For manual backup: use **Backup now** or rely on point-in-time recovery (Pro)

### pg_dump (Manual Backup)

For self-hosted or manual backup:

```bash
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --no-owner \
  --no-acl \
  -F c \
  -f uhome-backup-$(date +%Y%m%d).dump
```

### Local Supabase

Local Supabase data lives in Docker volumes. To persist:

- Use `supabase db dump` to export schema and data
- Or rely on `supabase db reset` to rebuild from migrations (no backup needed for local)

## Recovery Procedures

### Restore from Supabase Dashboard

1. Go to **Database** → **Backups**
2. Select a backup point
3. Follow the restore wizard (may create a new project or overwrite)

### Restore from pg_dump

```bash
pg_restore -d "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --no-owner \
  --no-acl \
  --clean \
  uhome-backup-YYYYMMDD.dump
```

## Pre-Migration Checklist

Before applying migrations to production:

1. **Backup** — Take a full backup using one of the methods above
2. **Verify** — Run `supabase db reset` locally and confirm migrations apply cleanly
3. **Test** — Run `npm run seed:demo` and `npm run test:e2e:headless` locally
4. **Apply** — Run migrations against production (Supabase SQL Editor or `supabase db push`)
5. **Verify** — Run `npm run verify:cloud-parity` (connection + table parity) or `npm run verify:schema-congruence` (staging vs prod)

## Recommended Schedule

- **Production**: Enable Supabase Pro automated daily backups
- **Before each release**: Manual backup before applying migrations
- **Retention**: Keep at least 7 days of backups; 30 days for compliance-sensitive data
