# Testing Lanes

Explicit testing lanes avoid confusion when a failure occurs. Each lane has a distinct purpose and cannot substitute for another.

## Lane Overview

| Lane | Purpose | Data source | Catches | Does NOT catch |
|------|---------|-------------|---------|-----------------|
| **Unit** | Env guards, pure logic, client wrappers | None | Logic bugs, guard gaps | RLS, latency, workflows |
| **Local E2E** | Correctness, RLS, workflows | Local Supabase | Integration bugs, RLS violations | Prod latency, prod schema drift |
| **Prod Smoke** | Read-only invariants | Production (anon key) | Schema drift, data consistency | Behavioral bugs, write paths |
| **Infra / Scale** | Latency, contention, limits | Prod read-only or synthetic | p95/p99 latency, connection saturation | Correctness |

## Unit

- **Scope:** Env guards, `assertEnvironmentCapabilities`, prod-readonly-client write-guard
- **Command:** `npm run test:unit`
- **Runner:** Vitest
- **Why it exists:** Fast feedback on safety logic. Does not require DB.

## Local E2E

- **Scope:** Correctness, RLS, full workflows (auth, properties, finances, messaging)
- **Command:** `npm run test:local` or `npm run test:e2e:headless`
- **Runner:** Playwright
- **Data:** Local Supabase (`npx supabase start` + migrations + seed)
- **Why it exists:** Validates behavior against real Postgres, Auth, Realtime. Deterministic and isolated.

## Prod Smoke

- **Scope:** Read-only invariants. Schema congruency. Financial aggregates. RLS boundaries.
- **Command:** `PROD_SMOKE_TEST=true npm run test:prod-smoke`
- **Runner:** Playwright (prod-smoke config)
- **Data:** Production (anon key only; no service key)
- **Why it exists:** Ensures prod schema and read paths match expectations. Physically safe (panic brake + runtime write-guard).

## Infra / Scale

- **Scope:** Latency, contention, connection limits, Realtime fanout
- **Command:** Manual or nightly. Not in default CI.
- **Data:** Prod read-only endpoints or synthetic load
- **Why it exists:** Answers: "Why didn't local tests catch this latency issue?" Local tests run against a single Docker instance; prod has different scale and network.

See [Cloud latency and scale testing](cloud-latency-scale-testing.md) for methodology.

## Snapshot-based local testing (optional)

Once schemas stabilize, periodically snapshot prod schema only (no data) and replay locally. Ensures local DB stays schema-parity accurate. Run manually or in a weekly job when migrations accelerate.
