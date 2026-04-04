# Local Supabase Testing

Local Supabase (CLI + Docker) is the canonical test backend for E2E tests, financial assertions, messaging/realtime tests, and dev mode.

**CI:** The `local-e2e` job in `.github/workflows/ci.yml` runs against local Supabase. Cloud staging is kept temporarily for baseline comparison; remove after 2 consecutive green local runs. See [Staging Decommission](staging-decommission.md).

## Prerequisites

- Docker (running)
- Supabase CLI (`npm install -g supabase` or install from [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli))

## Quick Start: Full Demo (Recommended)

**One command** to boot the app with complete demo data (18+ months of finances, work orders, congruent landlord/tenant data):

```bash
npx supabase start    # If not already running
npm run dev:demo
```

This will:
1. Ensure local Supabase is reachable
2. Reset the database (apply migrations)
3. Seed 18+ months of rent records, expenses, work orders
4. Start the dev server at http://localhost:1000

**Demo credentials:**
- Landlord: `demo-landlord@uhome.internal` / `DemoLandlord2024!`
- Tenant: `demo-tenant@uhome.internal` / `DemoTenant2024!`

Use `demo:reset` to re-seed without restarting the dev server (when Supabase is already running):
```bash
npm run demo:reset
```

## Manual Setup

### 1. Start local Supabase

```bash
npx supabase start
```

Wait for all services to be ready. Run `supabase status` for API URL and anon key.

### 2. Apply migrations

```bash
npx supabase db reset
```

This applies all migrations in `supabase/migrations/` in order.

### 3. Seed demo data

```bash
npm run seed:demo
```

Creates demo landlord (`demo-landlord@uhome.internal`) and tenant (`demo-tenant@uhome.internal`) with 18+ months of financial and operational data.

## Running tests

### Full local test run

```bash
npm run test:local
```

This will:

1. Ensure local Supabase is reachable
2. Reset database and apply migrations
3. Seed demo data
4. Run E2E tests headless

### E2E only (assumes Supabase is already running and seeded)

```bash
npm run test:e2e:headless
```

Set `.env.test` (or job env) with:

- `SUPABASE_ENV=local`
- `VITE_SUPABASE_URL=http://127.0.0.1:54321`
- `VITE_SUPABASE_ANON_KEY` (from `supabase status`)
- `SUPABASE_SERVICE_KEY` or `TEST_SUPABASE_SERVICE_KEY` (from `supabase status`)

## Service URLs

| Service | URL |
|---------|-----|
| API | `http://127.0.0.1:54321` |
| Studio | `http://127.0.0.1:54323` |
| DB | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Get anon key and service key: `supabase status`

## Why Did My Data Disappear?

Demo data is stored in the local Supabase database. It is lost when:

- You run `npx supabase db reset` (wipes DB, reapplies migrations)
- Docker containers restart (depending on volume setup)
- You start from a fresh clone without re-seeding

**To restore full demo data:** Run `npm run dev:demo` (full boot) or `npm run demo:reset` (reset + seed only). This guarantees 12 months of rent records, expenses, work orders, and congruent landlord/tenant data.

## Troubleshooting

### Docker not running

Start Docker Desktop (or equivalent) and retry `npx supabase start`.

### Port conflicts

If 54321, 54322, or 54323 are in use, stop conflicting processes or change ports in `supabase/config.toml`.

### Migration failures

- Ensure migrations in `supabase/migrations/` run in order
- Check for syntax errors or missing dependencies
- Run `npx supabase db reset` to start fresh

### Tests fail with "Missing Supabase environment variables"

Create `.env.test` with values from `supabase status`:

```bash
SUPABASE_ENV=local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<from supabase status>
SUPABASE_SERVICE_KEY=<from supabase status>
```
