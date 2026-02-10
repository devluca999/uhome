# Supabase Project Budget

Supabase free tier allows **2 cloud projects**. This document prevents accidental project sprawl.

## Current allocation

| Slot | Project | Purpose |
|------|---------|---------|
| 1 | **Production** | Real users only |
| 2 | **Recketlead** (or other) | Reclaimed from staging |

## Local and CI

| Resource | Cost |
|----------|------|
| Local Supabase (Docker) | **Free** |
| CI (local Supabase in Docker) | **Free** |

## Staging

| Status | Notes |
|-------|-------|
| **Deprecated** | No longer required for CI or E2E |
| **Emergency fallback** | Only if local-e2e fails and debugging requires cloud parity |
| **Decommission** | Safe to turn off after `verify:staging-decommission` passes and local-e2e is green for 2+ runs |

## Rules

1. **Active cloud projects:** Production only (plus one reserved for Recketlead)
2. **Local Supabase:** Default for dev and E2E
3. **CI:** Uses local Supabase; no cloud staging dependency
4. **Do not create** new cloud projects without explicit approval and budget check
