# AGENTS.md

## Cursor Cloud specific instructions

### Overview

uhome is a property management SaaS (React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui) with a Supabase backend. It is a single-package repo (not a monorepo).

### Dev server

- `npm run dev` starts Vite on port 1000, which requires root privileges on Linux. Use `npx vite --port 3000 --host` instead, or run on any port above 1024.
- The dev server needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` or it will throw at startup. For UI-only work, placeholder values pointing to `http://localhost:54321` are sufficient to boot the app (Supabase calls will fail but the UI renders).
- Dev mode (mock data for demos/tests) requires the Supabase URL to be non-production (containing `localhost`, `staging`, or `test`). Enable with `VITE_TENANT_DEV_MODE_ENABLED=true` and/or `VITE_LANDLORD_DEV_MODE_ENABLED=true` in `.env.local`.

### Standard commands (see `package.json` scripts)

| Task | Command |
|------|---------|
| Lint | `npm run lint` |
| Type-check | `npm run type-check` |
| Unit tests | `npm run test:unit` |
| Build | `npm run build` |
| E2E tests | `npm run test:e2e:headless` (requires local Supabase via Docker) |

### Dependencies

- Install with `npm install --legacy-peer-deps` (required due to peer dependency conflicts).
- Node.js 20+ required; Node 22 works fine.

### Supabase backend

- Full backend functionality (auth, data, storage) requires either a cloud Supabase project or local Supabase (`npx supabase start`, requires Docker).
- Without Supabase, the app UI still renders; public pages (`/`, `/login`, `/signup`, `/privacy`, `/terms`) load fully. Auth-protected pages redirect or show error boundaries.
- E2E tests (`npm run test:e2e:headless`) require a running local Supabase instance.

### Gotchas

- ESLint uses flat config (`eslint.config.js`) with `FlatCompat` for legacy extends. Warnings are expected; zero errors is the baseline.
- The build produces a large chunk warning (>500 KB) — this is a known issue in the project and not a build failure.
