# Environment configuration

> **Summary for AI / planning.** Variable-level detail lives in `docs/environment-variables.md` and `.env.example`.

## Canonical references

| Resource | Location |
|----------|----------|
| Variable catalog | [docs/environment-variables.md](../docs/environment-variables.md) |
| Example env file | [.env.example](../.env.example) |
| Environment → Supabase mapping | [docs/environment-mapping.md](../docs/environment-mapping.md) |
| Local / test setup | [docs/environment_setup.md](../docs/environment_setup.md), [.env.test](../.env.test) |
| Staging-specific | [docs/staging-environment.md](../docs/staging-environment.md) |

## Environment matrix (outline)

| Variable group | Purpose |
|----------------|---------|
| `VITE_*` | Browser-exposed (build-time) — Supabase URL/anon, environment label |
| `SUPABASE_*` | Server/scripts — service role, env guards |
| Third-party | Stripe, Postal, VAPID, etc. — see `.env.example` |

## Safety and guards

- Production vs staging vs local: [docs/environment-mapping.md](../docs/environment-mapping.md)
- `src/lib/env-safety.ts`, `tests/helpers/env-guard.ts` — used by seeds and tests

## Secrets management

<!-- Where secrets live: GitHub Actions secrets, Vercel, 1Password, etc. Do not paste values here. -->

| Context | Storage |
|---------|---------|
| CI | GitHub Actions `secrets.*` |
| Production/staging hosting | <!-- Vercel / other --> |

## Database / CLI project refs

- `SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_PRODUCTION_PROJECT_REF` — see [.env.example](../.env.example) and [docs/database-migrations.md](../docs/database-migrations.md)

## Open questions

<!-- Rotations, per-developer vs shared staging, preview env isolation. -->
