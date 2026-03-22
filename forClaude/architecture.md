# Architecture

> **Summary for AI / planning.** Deep dives live under `docs/architecture/`, `docs/adapter-architecture.md`, etc.

## Architectural style

- **Frontend:** SPA (Vite + React + TypeScript). Routing: React Router.
- **Backend:** Supabase-managed Postgres + Auth + Storage; business logic split between client hooks, RPCs, and Edge Functions.

## Layering

<!-- Describe how UI → hooks/data → Supabase → Edge Functions is organized. -->

| Layer | Location (indicative) | Notes |
|-------|-------------------------|--------|
| Pages / routes | `src/pages/` | |
| UI components | `src/components/` | |
| Data / hooks | `src/hooks/` | |
| Supabase client | `src/lib/supabase/` | |
| Edge Functions | `supabase/functions/` | |

## Key subsystems

### Data access

- **Current pattern:** Direct Supabase usage from hooks (documented tradeoffs in [docs/adapter-architecture.md](../docs/adapter-architecture.md)).
- **Future / optional abstraction:** Same doc describes a data-provider direction.

### Realtime and messaging

- [docs/architecture/messaging.md](../docs/architecture/messaging.md)

### Leases and tenancy model

- [docs/architecture/lease-model.md](../docs/architecture/lease-model.md)

### PWA / offline

- [docs/pwa_setup.md](../docs/pwa_setup.md)

## Boundaries and dependencies

<!-- What must not call what; shared packages; test vs prod paths. -->

## Cross-cutting concerns

| Concern | Where documented |
|---------|------------------|
| Env safety / tenant dev mode | [docs/tenant-dev-mode.md](../docs/tenant-dev-mode.md), `src/lib/env-safety.ts` |
| Feature flags / staging-only behavior | [docs/testing/staging-only.md](../docs/testing/staging-only.md) |

## Related docs

| Topic | Location |
|-------|----------|
| Engineering rules | [docs/engineering_rules.md](../docs/engineering_rules.md) |
| UI conventions | [docs/ui_conventions.md](../docs/ui_conventions.md) |
| Monorepo / git workflow | [docs/git-workflow.md](../docs/git-workflow.md) |

## Future architecture notes

<!-- Sharding, mobile app, BFF, etc. Link to roadmap. -->
