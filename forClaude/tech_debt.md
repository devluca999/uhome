# Technical debt & known limitations

> **Summary for AI / planning.** Use this file for **engineering-facing** debt tracking. Link to GitHub issues or ADRs when possible.

## How to use this doc

- Add items with **impact**, **area**, and **suggested direction** (not just complaints).
- Remove or archive items when resolved (or move detail to [decisions_log.md](./decisions_log.md)).

## Architectural debt

| Item | Impact | Notes / links |
|------|--------|----------------|
| Direct Supabase in hooks | Coupling, testability | [docs/adapter-architecture.md](../docs/adapter-architecture.md) |
| <!-- add rows --> | | |

## Database / migrations

| Item | Impact | Notes |
|------|--------|--------|
| Legacy SQL Editor flows vs CLI | Drift risk | [supabase/DATABASE_SETUP.md](../supabase/DATABASE_SETUP.md), [docs/database-migrations.md](../docs/database-migrations.md) |

## Testing debt

| Item | Impact | Notes |
|------|--------|--------|
| E2E vs visual vs staging | | [docs/testing/testing-lanes.md](../docs/testing/testing-lanes.md) |

## Performance / scale

| Item | Impact | Notes |
|------|--------|--------|
| <!-- N+1, bundle size, cold starts --> | | |

## Documentation debt

| Item | Notes |
|------|--------|
| Scattered launch/readiness docs | e.g. [docs/LAUNCH_READINESS_SUMMARY.md](../docs/LAUNCH_READINESS_SUMMARY.md), consolidate pointers in forClaude |

## Intentionally deferred

<!-- Things we chose not to fix yet — link to roadmap or ADR. -->
