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

### <!-- Add next decision here -->

- **Status:** 
- **Context:** 
- **Decision:** 
- **Links:** 

---

## Superseded decisions

<!-- Move entries here when replaced; note successor. -->
