# Interaction flows verification report — uhome

**Date:** 2026-03-22  
**Signed:** Cursor Agent (implementation pass) — engineering review recommended before production sign-off  
**Repository snapshot:** `git rev-parse --short HEAD` → `2f6445d` (branch not fixed; verify at merge time)  
**Scope:** Align [INTERACTION_FLOWS.md](../INTERACTION_FLOWS.md) with code, add structured flow logging, bounded client resilience for invite/auth, expand tests, document gaps.

---

## 1. Method

| Method | What was verified |
|--------|-------------------|
| Code review | Router, `AcceptInvite`, `NotificationDropdown`, `NotificationsPage`, landlord dashboard profitability section, `join-household-form`, `protected-route`, auth pages |
| Automated | `npx vitest run tests/unit/invite-token.spec.ts` — **9/9 passed** (local run 2026-03-22) |
| Not run in this session | Full Playwright matrix (requires `localhost:3000` + `.env.test` / Supabase); new spec path: `tests/e2e/notifications/notification-routing.spec.ts` |

---

## 2. Results summary

| Area | Status | Evidence |
|------|--------|----------|
| INTERACTION_FLOWS.md vs code | **Updated** | Stale “broken” blocks removed for accept-invite, profitability, notifications; tenant household token docs point to `extractTokenFromInviteInput` + unit tests |
| Accept invite | **Pass / hardened** | [`src/pages/auth/accept-invite.tsx`](../src/pages/auth/accept-invite.tsx): pending-token URL recovery, clear stale `pending_invite_token` on not-found/expired/used, **Try again** on fetch failure, `logFlowError` on failures |
| OAuth callback | **Pass / hardened** | [`src/pages/auth/callback.tsx`](../src/pages/auth/callback.tsx): user-facing `authCallbackError` via navigate state + [`login.tsx`](../src/pages/auth/login.tsx) one-shot display; `logFlowError` / `logFlowWarn` |
| Login / signup | **Pass / instrumented** | `logFlowError` on sign-in, Google, magic link failures; signup invite-flow errors logged |
| Protected routes | **Instrumented** | `logFlowWarn` on role mismatch redirect [`protected-route.tsx`](../src/components/auth/protected-route.tsx) |
| Join household | **Instrumented** | `logFlowWarn` on parse failure, `logFlowError` on unexpected errors |
| Notifications UI | **Doc corrected** | Portal + fixed positioning; View all → `/landlord/notifications` \| `/tenant/notifications` |
| Invite token parsing | **Tests expanded** | [`tests/unit/invite-token.spec.ts`](../tests/unit/invite-token.spec.ts) |
| Notifications E2E | **Added (smoke)** | [`tests/e2e/notifications/notification-routing.spec.ts`](../tests/e2e/notifications/notification-routing.spec.ts) |

---

## 3. Logging and resilience (auditable)

**New module:** [`src/lib/flow-log.ts`](../src/lib/flow-log.ts) — `logFlowError`, `logFlowWarn` with stable `[flow:Name] step:…` prefixes; context sanitization masks `token`, `email`, `password` keys.

| Flow | Resilience / logging |
|------|----------------------|
| AcceptInvite | Recover: redirect if `token` missing but `sessionStorage` has pending invite; clear pending on invalid invite messages; retry button refetches invite |
| AuthCallback | Recover: navigate to `/login` with explicit `authCallbackError` message when session/role missing |
| Login | Shows callback error once, then strips it from history state |
| JoinHousehold | No automatic retry (user-driven); logs parse failures |

**Intentionally not implemented:** automatic retries on mutating Supabase calls (avoids double-submit risk). Read refetch is limited to explicit user **Try again** on accept-invite error screen.

---

## 4. Deferred / follow-up (from INTERACTION_FLOWS)

| Item | Severity | Note |
|------|----------|------|
| Landlord property filter/search | Medium | Still marked not implemented in doc |
| Finances CSV export stress / chunking | Low | Manual or dedicated perf test |
| Tenant invite “email service down / draft save” | Medium | Product decision + backend contract |
| Admin audit CSV export | Low | Doc: not implemented |
| Admin “system health” dashboard | Low | Doc: not implemented |
| Notifications page: filters, delete, search | Low | Enhancement; list + mark read exists |
| Webkit E2E flakes | Medium | Existing debt; track in CI |
| Optional: Sentry (or similar) | Low | `flow-log` is console-only by design |

---

## 5. Suggested PR split (if merging incrementally)

1. **Docs:** `INTERACTION_FLOWS.md` matrix + reconciled sections  
2. **Auth/invite:** `flow-log.ts`, `accept-invite`, `callback`, `login`, `signup`, `protected-route`, `join-household-form`  
3. **Tests:** `invite-token.spec.ts`, `notification-routing.spec.ts`  
4. **Report:** this file (can ship with docs or alone)

---

## 6. Recommended next steps

1. Run `npm run test:e2e:quick` (or full suite) with dev server and valid `.env.test`; confirm `notification-routing` on Chromium at minimum.  
2. Human review of OAuth error copy on `/login` for tone and support links.  
3. Ticket deferred rows in Section 4; link ticket IDs back into INTERACTION_FLOWS when picked up.  
4. Consider `useCallback` stabilization for `getInviteByToken` in `useTenantInvites` to satisfy exhaustive-deps without comments (optional cleanup).

---

**End of report**
