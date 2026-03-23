# Environment Configuration

> Last updated: 2026-03-22 by P2

## Environment Matrix

| Environment | Branch | Supabase Project | Vercel Target | URL |
|-------------|--------|-----------------|---------------|-----|
| Local | any | Docker (local) | n/a | localhost:5173 |
| Staging | `develop`, `feature/*` | `uhome-staging` | Preview | demo.getuhome.app |
| Production | `main` | `vtucrtvajbmtedroevlz` | Production | app.getuhome.app |

## Variable Catalog

| Variable | Local | Staging | Production | Notes |
|----------|-------|---------|------------|-------|
| `VITE_SUPABASE_URL` | http://localhost:54321 | staging URL | prod URL | Browser-exposed |
| `VITE_SUPABASE_ANON_KEY` | local anon key | staging anon key | prod anon key | Browser-exposed, safe |
| `SUPABASE_SERVICE_ROLE_KEY` | local service key | staging service key | prod service key | Server/scripts only — never in browser |
| `VITE_APP_ENV` | `local` | `staging` | `production` | Used by env-safety guards |
| `STRIPE_SECRET_KEY` | test key | test key | live key | Edge Functions only |
| `STRIPE_WEBHOOK_SECRET` | local CLI secret | staging secret | prod secret | Webhook verification |
| `POSTAL_SMTP_HOST` | mock / skip | staging SMTP | prod SMTP | Email delivery |
| `VAPID_PUBLIC_KEY` | local | staging | prod | Push notifications |
| `VAPID_PRIVATE_KEY` | local | staging | prod | Server only |

- Full catalog: [docs/environment-variables.md](../docs/environment-variables.md)
- Example file: [.env.example](../.env.example)
- Test env: [.env.test](../.env.test)

## Secrets Management

| Context | Storage | Who manages |
|---------|---------|-------------|
| Local dev | `.env.local` (gitignored) | Developer |
| CI (GitHub Actions) | GitHub Secrets | Repo admin |
| Vercel (prod) | Vercel Environment Variables → Production | Repo admin |
| Vercel (staging) | Vercel Environment Variables → Preview | Repo admin |
| Edge Functions | Supabase Vault / env via CLI | Repo admin |

**Hard rules:**
- `.env.local` is gitignored — never commit real secrets
- Service role key never goes in `VITE_*` variables — it would be exposed in the browser bundle
- Staging and production secrets are always separate — never share keys across environments
- Rotate secrets immediately if exposed (commit, chat log, PR description, etc.)
- See [docs/environment-variables.md](../docs/environment-variables.md) for rotation procedures

## Environment Guards

`src/lib/env-safety.ts` and `tests/helpers/env-guard.ts` enforce:
- Seeds and DB resets refuse to run if `VITE_APP_ENV=production`
- E2E tests refuse to target production Supabase URL
- Demo data scripts check project ref before executing

Never bypass these guards. If a guard is blocking a legitimate operation, fix the operation — not the guard.

## Local Setup

```bash
# 1. Copy example env
cp .env.example .env.local

# 2. Start local Supabase
supabase start

# 3. Apply migrations + seed
npm run db:reset

# 4. Run dev server
npm run dev
```

Full setup: [docs/environment_setup.md](../docs/environment_setup.md)

## Supabase Project References

| Environment | Project Ref | Dashboard |
|-------------|------------|-----------|
| Local | n/a (Docker) | http://localhost:54323 |
| Staging | confirm staging ref in `.env.example` | Supabase dashboard |
| Production | `vtucrtvajbmtedroevlz` | Supabase dashboard |

## Vercel Project
| Field | Value |
|-------|-------|
| Project ID | `prj_NKfc6hGMcVtN6ui9Lq05HJQiIZL5` |
| Team ID | `team_e41D5zONCsdwAhGHNr36PyAD` |
| Framework | Vite |
| Node version | 24.x |
| Production domain | `app.getuhome.app` |
| Vercel alias | `uhome-mu.vercel.app` |

## Adding a New Environment Variable

1. Add to `.env.example` with a placeholder and comment
2. Add to `.env.test` if needed for test runs
3. Add to GitHub Secrets for CI
4. Add to Vercel for the appropriate environment scope
5. Document in [docs/environment-variables.md](../docs/environment-variables.md)
6. Update this file if it's a significant new variable group

## Related Docs
- [docs/environment-mapping.md](../docs/environment-mapping.md) — branch/env/URL mapping detail
- [docs/staging-environment.md](../docs/staging-environment.md) — staging-specific notes
- [docs/database-migrations.md](../docs/database-migrations.md) — migration env safety
- [forClaude/deployment_pipeline.md](./deployment_pipeline.md) — deploy workflow
