# Cloud Latency and Scale Testing

You do **not** need cloud staging for this. Use prod read-only endpoints.

## Recommended Approach

### Synthetic load against prod

- **Burst reads:** Many concurrent SELECTs against whitelisted tables
- **Concurrent org queries:** Simulate multi-tenant query patterns
- **Realtime subscriptions:** Connect-only (establish channels, measure connection limits)

### Metrics to capture

| Metric | Source |
|--------|--------|
| p95 / p99 latency | Response times from synthetic client |
| Connection saturation | Supabase dashboard, connection pool stats |
| Realtime fanout limits | Number of concurrent subscriptions before degradation |
| Postgres query time | Supabase logs, `pg_stat_statements` |

### Execution

- **When:** Manual or nightly
- **Where:** Outside CI (avoid flakiness from shared runners)
- **Tools:** k6, Artillery, or a custom script using the prod-readonly-client pattern
- **Safety:** Anon key only. No writes. Panic brake and runtime guards ensure physical safety.

## Example (conceptual)

```bash
# Not in repo - run manually with prod anon key
PROD_SMOKE_TEST=true VITE_SUPABASE_URL=https://prod.supabase.co VITE_SUPABASE_ANON_KEY=... \
  k6 run scripts/infra/load-test-reads.js
```

## What this catches

- Latency regressions
- Connection pool exhaustion
- Realtime subscription limits
- Query performance degradation

## What this does not catch

- Correctness (use Local E2E)
- RLS gaps (use Local E2E)
- Schema drift (use Prod Smoke)
