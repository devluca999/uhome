# Supabase (uhome / haume)

## Current workflow (CLI)

Use the Supabase CLI for **migrations** and local **Docker** development. See **[docs/database-migrations.md](../docs/database-migrations.md)** for:

- `npm run db:start` / `db:reset` / `db:migrate` / `db:seed`
- Promoting schema changes **local → uhome-staging → uhome-app**
- Production push confirmation (`CONFIRM_PRODUCTION_DB_PUSH`)
- Staging demo reseed (`CONFIRM_STAGING_RESEED`)

## Layout

| Path | Role |
|------|------|
| `migrations/` | Ordered SQL migrations |
| `seed.sql` | SQL seed after migrations (`db reset`) |
| `config.toml` | Local ports (this repo uses **55xxx** API port), Auth, seed path |
| `functions/` | Edge Functions |
| `schema.sql` | Historical / reference; prefer migrations for new work |

## Quick local start

```bash
npm run db:start
npm run db:reset
npm run db:seed:demo
```

Copy `VITE_SUPABASE_*` from `npm run db:status` or `npx tsx scripts/get-local-supabase-env.ts`.
