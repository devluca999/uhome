-- =============================================================================
-- supabase/seed.sql — runs after migrations on `supabase db reset` / `db seed`
-- =============================================================================
-- Keep this file limited to idempotent reference data and SQL-only fixtures.
-- Do NOT insert into auth.users here; Supabase Auth owns that schema.
--
-- Full demo (auth users, properties, leases, etc.):
--   Local:  npm run db:reset && npm run db:seed:demo
--   Remote: see docs/database-migrations.md (staging only; requires confirmation)
-- =============================================================================

-- Marker query so the file is valid SQL even when you add no seed rows yet.
SELECT 1 AS supabase_seed_applied;
