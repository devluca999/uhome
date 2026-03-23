# Architecture decisions log

> **ADR-style log for AI / planning.** Record **decisions that are expensive to reverse** or that explain odd-looking code. Full narrative may exist elsewhere — link instead of copying.

## Template (copy per decision)

```markdown
### YYYY-MM-DD — Short title

- **Status:** proposed | accepted | superseded | deprecated
- **Context:** What problem triggered this?
- **Decision:** What did we choose?
- **Consequences:** Tradeoffs, operational impact.
- **Links:** PRs, docs, issues.
```

---

## Log

### Framework — Vite + React

- **Status:** accepted (historical)
- **Context:** SPA property management product.
- **Decision:** Vite + React + TypeScript.
- **Links:** [docs/framework_decision.md](../docs/framework_decision.md)

### Supabase as BaaS

- **Status:** accepted
- **Context:** Auth, Postgres, Storage, Edge Functions for a small team.
- **Decision:** Supabase for backend.
- **Links:** [README.md](../README.md), [forClaude/database_schema.md](./database_schema.md)

### 2026-03-22 — Subscription tier structure: Free / Landlord / Portfolio

- **Status:** accepted
- **Context:** Pre-launch pricing strategy. Needed to define tiers before Stripe integration. Initial idea was $15/pro with 1 collaborator. Reconsidered at $29 base.
- **Decision:** 3-tier structure — Free (1 property), Landlord $29/mo (10 properties, 1 collaborator), Portfolio $59/mo (30 properties, 3 collaborators, CSV export). Property count is the primary gating mechanism, not seats. Annual billing = 2 months free.
- **Consequences:** `subscription_limits` table seeded with these values. Check constraints added to `subscriptions.plan` and `subscriptions.status`. Frontend `plans.ts` is single source of truth.
- **Links:** `src/lib/stripe/plans.ts`, `docs/subscription-model.md`, migration `20260322000003`

### <!-- Add next decision here -->

- **Status:** 
- **Context:** 
- **Decision:** 
- **Links:** 

---

## Superseded decisions

<!-- Move entries here when replaced; note successor. -->
