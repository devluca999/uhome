# Database migrations and seeds (Supabase)

This document describes the **Supabase CLI** workflow for schema changes, local development, and promoting changes through **staging** to **production**.

## Projects (cloud)

| Environment | Supabase project (dashboard name) | Typical role |
|-------------|-----------------------------------|--------------|
| Staging | `uhome-staging` | QA, demos, Vercel Preview, CI visual tests |
| Production | `uhome-app` | Live users, Vercel Production |

**Project ref** (subdomain of `https://<ref>.supabase.co`) is the stable identifier. Store production and staging refs in `.env.local` (not committed) as `SUPABASE_PRODUCTION_PROJECT_REF` and `SUPABASE_STAGING_PROJECT_REF` for scripts and verification.

## Prerequisites

- **Docker** (for local Supabase)
- **Node** dependencies: `npm ci`
- **Supabase CLI**: declared in `package.json` (`supabase`); invoke via `npx supabase …` or npm scripts below

## Folder layout

| Path | Purpose |
|------|---------|
| `supabase/migrations/` | Versioned SQL migrations (applied in order) |
| `supabase/seed.sql` | SQL-only seed run after migrations on `db reset` / `db seed` |
| `supabase/config.toml` | Local stack ports, seed path, Auth settings |
| `scripts/seed-production-demo.ts` | Rich demo data (Auth + API); **not** pure SQL |

## npm scripts

| Script | What it does |
|--------|----------------|
| `npm run db:start` | Start local Supabase (Docker) |
| `npm run db:stop` | Stop local stack |
| `npm run db:status` | Show API URL, keys snippet, health |
| `npm run db:reset` | **Local only**: drop DB, re-run all migrations, then `seed.sql` |
| `npm run db:migrate` | `supabase db push` to the **linked** cloud project, with production guard (see below) |
| `npm run db:migration:new -- <name>` | Create a new timestamped file under `supabase/migrations/` |
| `npm run db:seed` | Re-apply `seed.sql` to **local** DB |
| `npm run db:seed:demo` | Run TypeScript demo seed (`seed:demo`) — local or staging with confirmation |

**Never** add an npm script that runs `supabase db reset` against a remote project.

## Workflow: local → staging → production

### 1. Develop locally

1. `npm run db:start`
2. Optionally copy env from CLI: `npx tsx scripts/get-local-supabase-env.ts` (or paste from `npm run db:status`)
3. Create a migration: `npm run db:migration:new -- add_widget_column`
4. Edit the new file under `supabase/migrations/`
5. Apply locally: `npm run db:reset`
6. Run app + tests against local Supabase
7. For realistic data: `npm run db:seed:demo`

### 2. Deploy schema to staging (`uhome-staging`)

1. `npx supabase link --project-ref <staging-ref>` (one-time per machine; stores ref under `supabase/.temp/`)
2. `npm run db:migrate` — runs `supabase db push` (not `db reset`)
3. Reseed demo data if needed (destructive to data — coordinate with the team):

   **cmd.exe**

   ```bat
   set SUPABASE_ENV=staging
   set VITE_SUPABASE_URL=https://<staging-ref>.supabase.co
   set VITE_SUPABASE_ANON_KEY=...
   set SUPABASE_SERVICE_ROLE_KEY=...
   set CONFIRM_STAGING_RESEED=yes
   npm run db:seed:demo
   ```

   **PowerShell**

   ```powershell
   $env:SUPABASE_ENV="staging"
   $env:VITE_SUPABASE_URL="https://<staging-ref>.supabase.co"
   $env:CONFIRM_STAGING_RESEED="yes"
   npm run db:seed:demo
   ```

   `CONFIRM_STAGING_RESEED=yes` is required for any **non-local** URL so a misconfigured `.env` cannot silently seed the wrong project.

### 3. Deploy schema to production (`uhome-app`)

1. After staging verification, link production **only when ready**:

   `npx supabase link --project-ref <production-ref>`

2. Set `SUPABASE_PRODUCTION_PROJECT_REF=<production-ref>` in your environment (see `.env.example`).

3. Run:

   ```bash
   CONFIRM_PRODUCTION_DB_PUSH=yes npm run db:migrate
   ```

   The wrapper in `scripts/db-push.ts` refuses to push when the linked ref equals `SUPABASE_PRODUCTION_PROJECT_REF` unless `CONFIRM_PRODUCTION_DB_PUSH=yes`. This blocks accidental production pushes during normal staging work.

4. Prefer applying during a maintenance window for risky changes; always take a backup or rely on Supabase point-in-time recovery per your org policy.

### 4. Vercel mapping (frontend only)

| Vercel | Supabase |
|--------|----------|
| Preview | Staging project (`uhome-staging`) |
| Production | Production project (`uhome-app`) |

Schema changes are **not** applied by Vercel builds; they follow the CLI flow above. Ensure preview/prod env vars point at the correct `VITE_SUPABASE_URL` / anon keys (see `docs/environment-mapping.md`).

## Safety rules

| Rule | Why |
|------|-----|
| No `db reset` on cloud | Wipes data and auth; local only |
| `CONFIRM_PRODUCTION_DB_PUSH` for prod push | Prevents mistaken `db push` when linked to `uhome-app` |
| `CONFIRM_STAGING_RESEED` for remote demo seed | Prevents accidental mass writes to staging from a bad env |
| Migrations are forward-only SQL | Use new migration files to alter schema; avoid editing old applied files |

## CI

GitHub Actions runs `npm run db:reset` then `npm run seed:demo` for E2E (see `.github/workflows/ci.yml`), matching the local reset + demo flow.

## Related docs

- `supabase/DATABASE_SETUP.md` — legacy notes and manual SQL editor flows
- `docs/environment-mapping.md` — URL / branch / hosting matrix
- `supabase/README.md` — short pointer into this workflow
