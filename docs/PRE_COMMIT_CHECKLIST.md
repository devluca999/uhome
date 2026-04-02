# Pre-commit and pre-push checklist

Run this **before every commit** (and again before **push** if anything changed after the commit). Keeps the repo, CI, and launch docs aligned.

## 1. Code quality

- [ ] `npm run type-check`
- [ ] `npm run lint` (fix any new errors in files you touched)
- [ ] Spot-check the app for the feature or fix you changed

## 2. Documentation (standard — do not skip if the work affects launch progress)

Update **at least** what applies:

- [ ] **[LAUNCH_SPRINT_CHECKLIST.md](./LAUNCH_SPRINT_CHECKLIST.md)** — Mark items complete, refresh the progress summary table, adjust “Critical path” if needed.
- [ ] **[SESSION_SUMMARY.md](../SESSION_SUMMARY.md)** — Append a short “update” section or revise session status when you finish a sprint chunk.
- [ ] **Handoff / audit files** (e.g. `CURSOR_HANDOFF_ITEM14.md`) — Set status to complete or add a “Superseded by …” note so nobody repeats the work.
- [ ] **[docs/README.md](./README.md)** — Sprint counts and “Next actions” if they changed.
- [ ] **Root [README.md](../README.md)** — “Launch Sprint Documentation” status and links if outdated.

If you only fixed a trivial typo, you can skip checklist tables — but still ask: *did any sprint item status change?*

## 3. Secrets, deploys, and CI

When your change touches Edge Functions or deploy workflows:

- [ ] Local `.env` / `.env.example` updated if new variables are required (no secrets committed).
- [ ] Note any **manual** steps (Supabase deploy, GitHub secrets, Stripe dashboard) in the checklist item or PR description.

## 4. Git

- [ ] `git status` — only intentional files staged
- [ ] Commit message describes **what** and **why** (and references sprint item if applicable)

---

**Automation:** This file is the human standard. Optional: add a `prepare` or `pre-push` script in `package.json` that runs `type-check` only; doc updates stay a deliberate step so narrative stays accurate.
