# forClaude — AI & CTO documentation

This folder holds **internal technical documentation** intended for:

- **AI assistants** (e.g. Claude) doing architecture review, onboarding, and impact analysis
- **Engineering leads** planning long-term direction and tracking decisions

It is **not** end-user documentation. Product-facing or marketing content belongs elsewhere.

## What’s here

| File | Purpose |
|------|---------|
| [system_overview.md](./system_overview.md) | Product and system at a glance |
| [architecture.md](./architecture.md) | Application structure, integrations, boundaries |
| [database_schema.md](./database_schema.md) | Data model, migrations, Supabase |
| [deployment_pipeline.md](./deployment_pipeline.md) | CI/CD, hosting, release flow |
| [environment_config.md](./environment_config.md) | Env vars, environments, secrets mapping |
| [security_model.md](./security_model.md) | Auth, RLS, abuse prevention, compliance hooks |
| [tech_debt.md](./tech_debt.md) | Known limitations and refactor candidates |
| [roadmap.md](./roadmap.md) | Near- and long-term technical priorities |
| [decisions_log.md](./decisions_log.md) | Architecture Decision Records (ADR-style) |

## Relationship to the rest of the repo

Canonical detail often lives under **`docs/`**, **`supabase/`**, **`README.md`**, and **`.github/workflows/`**. Files in **`forClaude/`** should **summarize and link** to those sources rather than copy them verbatim. When a major technical change lands (new service, migration strategy, auth change, deployment path), **update the relevant file here** so AI and leads keep a single mental model.

## Maintenance

- Treat this directory as **living CTO documentation**: update after significant architectural or operational changes.
- Prefer short summaries + links over duplicating long specs.
- Use [decisions_log.md](./decisions_log.md) for notable choices (why we picked X, what we rejected).
