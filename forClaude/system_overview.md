# System overview

> **Summary for AI / planning.** For full product narrative, see [docs/project_context.md](../docs/project_context.md) and [README.md](../README.md).

## Purpose

<!-- 2–4 sentences: what problem the system solves and for whom. -->

- **Canonical product context:** [docs/project_context.md](../docs/project_context.md) — roles (landlord / tenant), MVP goals, non-goals, engineering priorities.

## High-level architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Web client │────▶│   Supabase   │     │  Edge Functions │
│  (Vite/React)│     │ Auth/DB/API │     │  (Deno)         │
└─────────────┘     └──────────────┘     └─────────────────┘
```

<!-- Extend or replace with a more accurate diagram when needed. -->

- **Stack snapshot:** [README.md § Tech Stack](../README.md)
- **Framework rationale (historical):** [docs/framework_decision.md](../docs/framework_decision.md)

## Users and roles

| Role | Notes |
|------|--------|
| Landlord | <!-- link to account-types / RLS if needed --> |
| Tenant | |

- **Account types:** [docs/account-types.md](../docs/account-types.md)

## External systems

| System | Role |
|--------|------|
| Supabase | Auth, Postgres, Storage, Realtime |
| Vercel (or other) | Frontend hosting — confirm in [deployment_pipeline.md](./deployment_pipeline.md) |
| Stripe | Payments / Connect — see product docs |

## Non-goals (reminder)

See [docs/project_context.md](../docs/project_context.md) (Non-goals for MVP) and [docs/scope_guardrails.md](../docs/scope_guardrails.md).

## Related docs

| Topic | Location |
|-------|----------|
| Product principles | [docs/product_principles.md](../docs/product_principles.md), [docs/product_philosophy.md](../docs/product_philosophy.md) |
| MVP scope | [docs/mvp_scope.md](../docs/mvp_scope.md) |
| Design direction | [docs/design_direction.md](../docs/design_direction.md) |

## Open questions

<!-- Bullet list: strategic unknowns, pending product decisions. -->
