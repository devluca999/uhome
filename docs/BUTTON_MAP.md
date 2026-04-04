# Button map

Interactive controls inventory for uhome (generated from [`tests/fixtures/button-map.ts`](../tests/fixtures/button-map.ts)). Regenerate: `npm run docs:button-map`.

## Subscription Plans (landlord)

**Note:** `/landlord/subscription-plans` is **not** registered in `src/router/index.tsx`. CTAs still call `navigate('/landlord/subscription-plans')` from Settings (billing), Properties (plan gate), and Finances — users may see a blank child route or unexpected UI until a route is added.

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Settings · Billing | Upgrade plan / upgrade banners | Opens subscription flow | Navigates to `/landlord/subscription-plans` | Broken route — see note above | ❌ |
| Properties · Plan gate | View plans | Opens plans | Same as above | Only when add-property blocked | ❌ |
| Finances | Upgrade / View plans CTAs | Opens plans | Same as above | Copy varies by UI state | ❌ |


## Landlord

### Landlord · Dashboard

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Landlord · Dashboard · `/landlord/dashboard` · landlord-layout.tsx | Main nav: Dashboard | Navigate to landlord dashboard | URL matches `/\/landlord\/dashboard/` | Hidden if user removed nav item in settings (cannot reorder required item off) | ❌ |
| Landlord · Dashboard · `/landlord/dashboard` · landlord-layout.tsx | Main nav: Finances | Navigate to finances | URL matches `/\/landlord\/finances/` | Nav visibility follows settings.hiddenNavItems | ❌ |
| Landlord · Dashboard · `/landlord/dashboard` · landlord-layout.tsx | Sign out | Sign out and redirect to login | URL matches `/\/login/` | Clears dev_bypass keys when present | ❌ |
| Landlord · Dashboard · `/landlord/dashboard` · landlord/dashboard.tsx | View Ledger (Financial Summary) | Open ledger route | URL matches `/\/landlord\/ledger/` | Route may 404 if not registered in router | ❌ |
| Landlord · Dashboard · `/landlord/dashboard` · landlord/dashboard.tsx | Quick Actions: Add Property | Navigate to properties | URL matches `/\/landlord\/properties/` | — | ❌ |
| Landlord · Dashboard · `/landlord/dashboard` · landlord/dashboard.tsx | Quick Actions: Invite Tenant | Navigate to tenants | URL matches `/\/landlord\/tenants/` | — | ❌ |

### Landlord · Documents

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Landlord · Documents · `/landlord/documents` · landlord/documents.tsx | Upload document | Trigger hidden file input | URL matches `/\/landlord\/documents/` | Exact label may be Upload files | ❌ |

### Landlord · Finances

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Landlord · Finances · `/landlord/finances` · landlord/finances.tsx | Export CSV | Download CSV blob | URL matches `/\/landlord\/finances/` | File download not asserted in Playwright here | ❌ |
| Landlord · Finances · `/landlord/finances` · landlord/finances.tsx | Toggle add expense | Show expense expense form section | Visible: `/amount\|category\|cancel/i` | Copy may be Record expense | ❌ |

### Landlord · Messages (thread)

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Landlord · Messages (thread) · `/landlord/messages/mock-lease-id` · landlord/messages.tsx | Back to all conversations (ghost) | Navigate to /landlord/messages | URL matches `/\/landlord\/messages/` | Only on thread route; mock URL may not load thread | ❌ |

### Landlord · Operations

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Landlord · Operations · `/landlord/operations` · landlord/operations.tsx | New work order | Open work order form | Visible: `/description\|cancel\|property/i` | Primary CTA label may differ slightly | ❌ |

### Landlord · Properties

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Landlord · Properties · `/landlord/properties` · landlord/properties.tsx | Add Property | Open create property form / gate by plan | Visible: `/property\|address\|cancel/i` | Plan gate shows notice + View plans CTA; subscription loading disables button | ❌ |
| Landlord · Properties · `/landlord/properties` · landlord/properties.tsx | View plans (after plan gate notice) | navigate(/landlord/subscription-plans) | URL matches `/\/landlord\/subscription-plans/` | Only when planGateNotice set; route not in router — expect broken/blank/error page | ❌ |
| Landlord · Properties · `/landlord/properties` · landlord/properties.tsx | Clear (filters) | Reset filter state | URL matches `/\/landlord\/properties/` | Button only when a filter active — skip if not visible | ❌ |

### Landlord · Settings

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Landlord · Settings · `/landlord/settings` · settings.tsx | Theme: Light preview | Set light theme preference | URL matches `/\/landlord\/settings/` | ThemePreview may not expose name Light — using loose match | ❌ |
| Landlord · Settings · `/landlord/settings` · settings.tsx | Navigation layout: Header | Persist header nav layout | URL matches `/\/landlord\/settings/` | Matches section card button | ❌ |
| Landlord · Settings · `/landlord/settings` · settings.tsx | Upgrade plan | navigate(/landlord/subscription-plans) | URL matches `/\/landlord\/subscription-plans/` | Shown when plan === free; mock subscription may hide button | ❌ |
| Landlord · Settings · `/landlord/settings` · settings.tsx | Log Out | Sign out | URL matches `/\/login/` | — | ❌ |

### Landlord · Tenants

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Landlord · Tenants · `/landlord/tenants` · landlord/tenants.tsx | Invite Tenant | Show invite flow UI | Visible: `/invite\|email\|cancel/i` | — | ❌ |
| Landlord · Tenants · `/landlord/tenants` · landlord/tenants.tsx | Add Tenant | Show add tenant form | Visible: `/tenant\|cancel/i` | — | ❌ |
| Landlord · Tenants · `/landlord/tenants` · landlord/tenants.tsx | View mode: Card | Switch to card layout | URL matches `/\/landlord\/tenants/` | Label must match UI — may be icon-only in some builds | ❌ |


## Tenant

### Tenant · Household

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Tenant · Household · `/tenant/household` · tenant/household.tsx | Join with Invite Link (empty state) | Show JoinHouseholdForm | Visible: `/invite\|cancel\|code/i` | Hidden when tenant already has lease; mock tenant has lease | ❌ |

### Tenant · Maintenance

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Tenant · Maintenance · `/tenant/maintenance` · tenant/maintenance.tsx | New Request | Open maintenance form | Visible: `/description\|cancel\|category\|maintenance/i` | Empty state uses Submit Your First Request instead | ❌ |

### Tenant · Maintenance (nav)

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Tenant · Maintenance (nav) · `/tenant/maintenance` · tenant-layout.tsx | Main nav: Payment History | Navigate to /tenant/finances | URL matches `/\/tenant\/finances/` | Dashboard can throw if tenant summary RPC returns incomplete row; maintenance route is stable with mock lease | ❌ |

### Tenant · Messages

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Tenant · Messages · `/tenant/messages` · tenant/messages.tsx | Tab: Household | Show household thread | Visible: `/household\|roommate\|message/i` | TabsTrigger is a plain button (ui/tabs.tsx), not role=tab; requires active lease from mock | ❌ |


## Admin

### Admin · Audit & Security

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Admin · Audit & Security · `/admin/audit-security` · admin/audit-security.tsx | Tab: Security Alerts | Switch tab | Visible: `/alert\|severity\|security/i` | Exact tab label — verify UI | ❌ |

### Admin · Messages & Support

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Admin · Messages & Support · `/admin/messages-support` · admin/messages-support.tsx | Tab: Conversations | Switch tab | Visible: `/conversation\|lease\|message/i` | Default tab may be tickets | ❌ |

### Admin · Overview

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Admin · Overview · `/admin/overview` · admin-layout.tsx | Sidebar: Users | Navigate to users | URL matches `/\/admin\/users/` | Feature-flag items may be hidden | ❌ |
| Admin · Overview · `/admin/overview` · admin-layout.tsx | Sidebar: Audit & Security | Navigate | URL matches `/\/admin\/audit-security/` | — | ❌ |
| Admin · Overview · `/admin/overview` · admin/overview.tsx | Tab: Transactions | Switch overview tab | Visible: `/revenue\|transaction\|payment/i` | TabsTrigger renders as button without role tab | ❌ |

### Admin · Payments

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Admin · Payments · `/admin/payments` · admin/payments.tsx | Tab: Failed Transactions | Switch tab | Visible: `/fail\|declin\|rent_records/i` | TabsTrigger is button | ❌ |

### Admin · System

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Admin · System · `/admin/system` · admin/system.tsx | Send test notifications | Invoke handleSendTestNotifications | URL matches `/\/admin\/system/` | May toast success/error | ❌ |

### Admin · Users

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Admin · Users · `/admin/users` · admin/users.tsx | Tab: Tenants | Filter list to tenant role | Visible: `/Tenant accounts\|Tenants/` | TabsTrigger is button; label includes count | ❌ |
| Admin · Users · `/admin/users` · admin/users.tsx | Row action: Ban user (icon) | Open AdminActionModal — Ban User | Dialog: /ban user/i | Not shown if user already banned; picks first matching row | ❌ |
| Admin · Users · `/admin/users` · admin/users.tsx (AdminActionModal) | Modal: Cancel | Close modal | URL matches `/\/admin\/users/` | Requires opening modal first | ❌ |


## Auth

### Auth · Callback

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Auth · Callback · `/auth/callback` · auth/callback.tsx | Completing sign in… | getSession; redirect dashboard or login | URL matches `/\/(login\|auth\/role-selection\|landlord\|tenant\|admin)/` | No OAuth hash in test — redirects login with error state | ❌ |

### Auth · Login

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Auth · Login · `/login` · auth/login.tsx | Sign In (submit) | signInWithPassword + role redirect | URL matches `/\/(landlord\|tenant\|admin)\//` | Invalid creds show error; connection errors surfaced in dev | ❌ |
| Auth · Login · `/login` · auth/login.tsx | Sign in with Google | OAuth redirect | N/A (external / manual) | External IdP | ❌ |
| Auth · Login · `/login` · auth/login.tsx | Use magic link instead | Toggle magic-link mode | Visible: `/Send Magic Link\|magic/i` | — | ❌ |

### Auth · Signup

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Auth · Signup · `/signup` · auth/signup.tsx | Create account (submit) | signUp + navigate by role | URL matches `/\/(landlord\|tenant\|login)/` | Validation min length 6 | ❌ |
| Auth · Signup · `/signup` · auth/signup.tsx | I am a: Landlord | Set role landlord | URL matches `/\/signup/` | Disabled in invite flow | ❌ |


## E2E coverage

Playwright: [`tests/e2e/critical-path/button-map.spec.ts`](../tests/e2e/critical-path/button-map.spec.ts) (uses [`setupMockSupabase`](../tests/visual/helpers/mock-supabase.ts)).

Entries may set `skipE2e` where flows are conditional, external (OAuth, Stripe), or covered elsewhere.
