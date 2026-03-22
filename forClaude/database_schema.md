# Database schema (Supabase / Postgres)

> **Summary for AI / planning.** Do not duplicate full DDL here — point to repo artifacts.

## Source of truth

| Artifact | Purpose |
|----------|---------|
| Migrations | `supabase/migrations/` — versioned SQL |
| Seed (SQL) | `supabase/seed.sql` — runs after migrations on local reset |
| Demo seed (TS) | `scripts/seed-production-demo.ts` — rich fixtures + Auth |
| Reference / legacy | `supabase/schema.sql`, `supabase/schema-unified.sql`, [docs/supabase_schema.md](../docs/supabase_schema.md) |

## Workflow (CLI)

- **Migrations, seeds, staging vs production:** [docs/database-migrations.md](../docs/database-migrations.md)
- **Legacy / manual setup notes:** [supabase/DATABASE_SETUP.md](../supabase/DATABASE_SETUP.md)
- **Supabase folder index:** [supabase/README.md](../supabase/README.md)

## Core entities (outline)

<!-- Fill with entity names and 1-line descriptions; link to domain docs. -->

| Entity / area | Notes |
|---------------|--------|
| users / profiles | Extended auth users |
| properties, tenants, leases | See lease model doc |
| maintenance / work orders | |
| documents / storage | |
| finances / rent | [docs/finances.md](../docs/finances.md) |

- **Lease model:** [docs/architecture/lease-model.md](../docs/architecture/lease-model.md)

## Row Level Security (RLS)

- Overview: [docs/security/rls.md](../docs/security/rls.md)
- Verification tooling: `npm run verify:rls` (see scripts and CI)

## Migrations policy

- Forward-only SQL files under `supabase/migrations/`
- No destructive remote resets via automation (see database-migrations doc)

## Backup and recovery

- [docs/backup-recovery.md](../docs/backup-recovery.md)

## Open questions

<!-- Partitioning, soft-delete strategy, audit tables, etc. -->
