# Security model

> **Summary for AI / planning.** Detailed policies live under `docs/security/` and compliance docs.

## Principles

- **Tenant isolation:** Postgres RLS as primary enforcement layer.
- **Least privilege:** Anon key in browser; service role only in trusted server contexts (scripts, Edge Functions).
- **Fail closed:** Ambiguous environment → tests/seeds refuse to run (see env guards).

## Authentication

- Supabase Auth (email/password, OAuth as configured).
- Session handling: <!-- link to auth context / client if needed -->

## Authorization (RLS)

- [docs/security/rls.md](../docs/security/rls.md)
- Data integrity audits: [docs/security/data-integrity-audit.md](../docs/security/data-integrity-audit.md)

## Rate limits and abuse prevention

- [docs/security/rate-limits.md](../docs/security/rate-limits.md)
- [docs/security/abuse-prevention.md](../docs/security/abuse-prevention.md)

## Edge Functions

- Sensitive operations in `supabase/functions/` — validate inputs, verify webhooks (e.g. Stripe), avoid leaking service role.

## Compliance (reference)

| Topic | Doc |
|-------|-----|
| GDPR | [docs/compliance/gdpr-compliance.md](../docs/compliance/gdpr-compliance.md) |
| CCPA | [docs/compliance/ccpa-compliance.md](../docs/compliance/ccpa-compliance.md) |

## Threat model (outline)

<!-- Fill: main assets, trust boundaries, top risks. -->

| Risk area | Mitigation notes |
|-----------|------------------|
| Cross-tenant data access | RLS, tests |
| Production accidents | Env guards, confirm flags for DB ops |
| API abuse | Rate limits, Edge Functions |

## Related docs

- [docs/production-env-checklist.md](../docs/production-env-checklist.md)
- [docs/launch-gates.md](../docs/launch-gates.md)

## Open questions

<!-- Pen test schedule, SOC2, secrets rotation. -->
