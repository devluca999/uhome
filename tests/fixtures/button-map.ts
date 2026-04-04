/**
 * Canonical interactive control map for docs + Playwright (see docs/BUTTON_MAP.md).
 * Regenerate markdown: npm run docs:button-map
 */

export type MapRole = 'landlord' | 'tenant' | 'admin' | 'auth'

export type PlaywrightRole = 'button' | 'link' | 'tab'

export interface ButtonMapPlaywright {
  role: PlaywrightRole
  /** getByRole name / accessible name */
  name: string | RegExp
  exact?: boolean
}

export type ButtonMapExpect =
  | { kind: 'url'; pattern: RegExp | string }
  | { kind: 'visible'; selector?: string; text?: string | RegExp }
  | { kind: 'dialog'; name: string | RegExp }
  | { kind: 'loaded'; heading: string | RegExp }
  | { kind: 'noop' }

export interface ButtonMapEntry {
  id: string
  mapRole: MapRole
  pageLabel: string
  route: string
  component: string
  elementDescription: string
  action: 'click' | 'submit' | 'navigate'
  playwright: ButtonMapPlaywright
  expectedAction: string
  expect: ButtonMapExpect
  edgeCases: string
  verified: '❌'
  /** Mock login email (must exist in tests/visual/helpers/mock-data MOCK_USERS) */
  sessionEmail?: string
  skipE2e?: boolean
  skipE2eReason?: string
}

const V = '❌' as const

function emailForRole(r: MapRole): string | undefined {
  if (r === 'landlord') return 'landlord@example.com'
  if (r === 'tenant') return 'tenant1@example.com'
  if (r === 'admin') return 'admin@example.com'
  return undefined
}

function E(
  base: Omit<ButtonMapEntry, 'verified' | 'sessionEmail'> & { sessionEmail?: string }
): ButtonMapEntry {
  const em = base.sessionEmail ?? emailForRole(base.mapRole)
  return {
    ...base,
    verified: V,
    sessionEmail: base.mapRole === 'auth' ? undefined : em,
  }
}

export const BUTTON_MAP_ENTRIES: ButtonMapEntry[] = [
  // ——— Landlord layout (header nav) ———
  E({
    id: 'll-nav-dashboard',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Dashboard',
    route: '/landlord/dashboard',
    component: 'landlord-layout.tsx',
    elementDescription: 'Main nav: Dashboard',
    action: 'click',
    playwright: { role: 'link', name: 'Dashboard' },
    expectedAction: 'Navigate to landlord dashboard',
    expect: { kind: 'url', pattern: /\/landlord\/dashboard/ },
    edgeCases: 'Hidden if user removed nav item in settings (cannot reorder required item off)',
  }),
  E({
    id: 'll-nav-finances',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Dashboard',
    route: '/landlord/dashboard',
    component: 'landlord-layout.tsx',
    elementDescription: 'Main nav: Finances',
    action: 'click',
    playwright: { role: 'link', name: 'Finances' },
    expectedAction: 'Navigate to finances',
    expect: { kind: 'url', pattern: /\/landlord\/finances/ },
    edgeCases: 'Nav visibility follows settings.hiddenNavItems',
  }),
  E({
    id: 'll-nav-signout',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Dashboard',
    route: '/landlord/dashboard',
    component: 'landlord-layout.tsx',
    elementDescription: 'Sign out',
    action: 'click',
    playwright: { role: 'button', name: 'Sign out' },
    expectedAction: 'Sign out and redirect to login',
    expect: { kind: 'url', pattern: /\/login/ },
    edgeCases: 'Clears dev_bypass keys when present',
  }),

  // ——— Landlord Dashboard page ———
  E({
    id: 'll-dash-view-ledger-financial',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Dashboard',
    route: '/landlord/dashboard',
    component: 'landlord/dashboard.tsx',
    elementDescription: 'View Ledger (Financial Summary)',
    action: 'click',
    playwright: { role: 'link', name: 'View Ledger' },
    expectedAction: 'Open ledger route',
    expect: { kind: 'url', pattern: /\/landlord\/ledger/ },
    edgeCases: 'Route may 404 if not registered in router',
  }),
  E({
    id: 'll-dash-quick-add-property',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Dashboard',
    route: '/landlord/dashboard',
    component: 'landlord/dashboard.tsx',
    elementDescription: 'Quick Actions: Add Property',
    action: 'click',
    playwright: { role: 'link', name: 'Add Property' },
    expectedAction: 'Navigate to properties',
    expect: { kind: 'url', pattern: /\/landlord\/properties/ },
    edgeCases: '—',
  }),
  E({
    id: 'll-dash-quick-invite',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Dashboard',
    route: '/landlord/dashboard',
    component: 'landlord/dashboard.tsx',
    elementDescription: 'Quick Actions: Invite Tenant',
    action: 'click',
    playwright: { role: 'link', name: 'Invite Tenant' },
    expectedAction: 'Navigate to tenants',
    expect: { kind: 'url', pattern: /\/landlord\/tenants/ },
    edgeCases: '—',
  }),

  // ——— Properties ———
  E({
    id: 'll-prop-add',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Properties',
    route: '/landlord/properties',
    component: 'landlord/properties.tsx',
    elementDescription: 'Add Property',
    action: 'click',
    playwright: { role: 'button', name: 'Add Property' },
    expectedAction: 'Open create property form / gate by plan',
    expect: { kind: 'visible', text: /property|address|cancel/i },
    edgeCases: 'Plan gate shows notice + View plans CTA; subscription loading disables button',
  }),
  E({
    id: 'll-prop-view-plans-gate',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Properties',
    route: '/landlord/properties',
    component: 'landlord/properties.tsx',
    elementDescription: 'View plans (after plan gate notice)',
    action: 'click',
    playwright: { role: 'button', name: 'View plans' },
    expectedAction: 'navigate(/landlord/subscription-plans)',
    expect: { kind: 'url', pattern: /\/landlord\/subscription-plans/ },
    edgeCases: 'Only when planGateNotice set; route not in router — expect broken/blank/error page',
    skipE2e: true,
    skipE2eReason: 'Gate-only visible when subscription blocks add; stub ambiguous',
  }),
  E({
    id: 'll-prop-clear-filters',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Properties',
    route: '/landlord/properties',
    component: 'landlord/properties.tsx',
    elementDescription: 'Clear (filters)',
    action: 'click',
    playwright: { role: 'button', name: 'Clear' },
    expectedAction: 'Reset filter state',
    expect: { kind: 'url', pattern: /\/landlord\/properties/ },
    edgeCases:
      'Renders only when a filter deviates from defaults; button-map spec activates sort before clicking Clear',
  }),

  // ——— Tenants ———
  E({
    id: 'll-ten-invite',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Tenants',
    route: '/landlord/tenants',
    component: 'landlord/tenants.tsx',
    elementDescription: 'Invite Tenant',
    action: 'click',
    playwright: { role: 'button', name: 'Invite Tenant' },
    expectedAction: 'Show invite flow UI',
    expect: { kind: 'visible', text: /invite|email|cancel/i },
    edgeCases: '—',
  }),
  E({
    id: 'll-ten-add',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Tenants',
    route: '/landlord/tenants',
    component: 'landlord/tenants.tsx',
    elementDescription: 'Add Tenant',
    action: 'click',
    playwright: { role: 'button', name: 'Add Tenant' },
    expectedAction: 'Show add tenant form',
    expect: { kind: 'visible', text: /tenant|cancel/i },
    edgeCases: '—',
  }),
  E({
    id: 'll-ten-view-card',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Tenants',
    route: '/landlord/tenants',
    component: 'landlord/tenants.tsx',
    elementDescription: 'View mode: Card',
    action: 'click',
    playwright: { role: 'button', name: 'Card' },
    expectedAction: 'Switch to card layout',
    expect: { kind: 'url', pattern: /\/landlord\/tenants/ },
    edgeCases: 'Hidden when VITE_ENABLE_TENANT_VIEW_MODES=false',
  }),

  // ——— Finances ———
  E({
    id: 'll-fin-export',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Finances',
    route: '/landlord/finances',
    component: 'landlord/finances.tsx',
    elementDescription: 'Export CSV',
    action: 'click',
    playwright: { role: 'button', name: /export.*csv/i },
    expectedAction: 'Download CSV blob',
    expect: { kind: 'url', pattern: /\/landlord\/finances/ },
    edgeCases: 'File download not asserted in Playwright here',
    skipE2e: true,
    skipE2eReason: 'Download event not covered',
  }),
  E({
    id: 'll-fin-add-expense',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Finances',
    route: '/landlord/finances',
    component: 'landlord/finances.tsx',
    elementDescription: 'Toggle add expense',
    action: 'click',
    playwright: { role: 'button', name: /add expense|record expense|\+ expense/i },
    expectedAction: 'Show expense expense form section',
    expect: { kind: 'visible', text: /amount|category|cancel/i },
    edgeCases: 'Toggles to Cancel when form is open',
  }),

  // ——— Operations ———
  E({
    id: 'll-op-new-work-order',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Operations',
    route: '/landlord/operations',
    component: 'landlord/operations.tsx',
    elementDescription: 'New work order',
    action: 'click',
    playwright: { role: 'button', name: /create work order|new work order/i },
    expectedAction: 'Open work order form',
    expect: { kind: 'visible', text: /description|cancel|property/i },
    edgeCases: '—',
  }),

  // ——— Documents ———
  E({
    id: 'll-doc-upload',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Documents',
    route: '/landlord/documents',
    component: 'landlord/documents.tsx',
    elementDescription: 'Upload document',
    action: 'click',
    playwright: { role: 'button', name: /upload/i },
    expectedAction: 'Trigger hidden file input',
    expect: { kind: 'url', pattern: /\/landlord\/documents/ },
    edgeCases: 'Exact label may be Upload files',
    skipE2e: true,
    skipE2eReason: 'Multiple Upload buttons; use dedicated spec',
  }),

  // ——— Messages ———
  E({
    id: 'll-msg-back-list',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Messages (thread)',
    route: '/landlord/messages/mock-lease-id',
    component: 'landlord/messages.tsx',
    elementDescription: 'Back to all conversations (ghost)',
    action: 'click',
    playwright: { role: 'button', name: /back|all conversations|messages/i },
    expectedAction: 'Navigate to /landlord/messages',
    expect: { kind: 'url', pattern: /\/landlord\/messages/ },
    edgeCases: 'Only on thread route; mock URL may not load thread',
    skipE2e: true,
    skipE2eReason: 'Needs real lease id',
  }),

  // ——— Settings ———
  E({
    id: 'll-set-theme-light',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Settings',
    route: '/landlord/settings',
    component: 'components/settings/theme-preview.tsx',
    elementDescription: 'Theme: Light preview',
    action: 'click',
    playwright: { role: 'button', name: /light/i },
    expectedAction: 'Set light theme preference',
    expect: { kind: 'url', pattern: /\/landlord\/settings/ },
    edgeCases: 'ThemePreview uses aria-label "{theme} theme preview"',
  }),
  E({
    id: 'll-set-nav-header',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Settings',
    route: '/landlord/settings',
    component: 'settings.tsx',
    elementDescription: 'Navigation layout: Header',
    action: 'click',
    playwright: { role: 'button', name: 'Header' },
    expectedAction: 'Persist header nav layout',
    expect: { kind: 'url', pattern: /\/landlord\/settings/ },
    edgeCases: 'Matches section card button',
  }),
  E({
    id: 'll-set-upgrade-plan',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Settings',
    route: '/landlord/settings',
    component: 'settings.tsx',
    elementDescription: 'Upgrade plan',
    action: 'click',
    playwright: { role: 'button', name: 'Upgrade plan' },
    expectedAction: 'navigate(/landlord/subscription-plans)',
    expect: { kind: 'url', pattern: /\/landlord\/subscription-plans/ },
    edgeCases: 'Shown when plan === free; mock subscription may hide button',
    skipE2e: true,
    skipE2eReason: 'Mock gives trialing paid plan — button absent',
  }),
  E({
    id: 'll-set-logout',
    mapRole: 'landlord',
    pageLabel: 'Landlord · Settings',
    route: '/landlord/settings',
    component: 'settings.tsx',
    elementDescription: 'Log Out',
    action: 'click',
    playwright: { role: 'button', name: 'Log Out', exact: true },
    expectedAction: 'Sign out',
    expect: { kind: 'url', pattern: /\/login/ },
    edgeCases: '—',
  }),

  // ——— Subscription Plans (missing route; reached from CTAs) ———
  // ——— Tenant layout ———
  E({
    id: 'tn-nav-payment-history',
    mapRole: 'tenant',
    pageLabel: 'Tenant · Maintenance (nav)',
    route: '/tenant/maintenance',
    component: 'tenant-layout.tsx',
    elementDescription: 'Main nav: Payment History',
    action: 'click',
    playwright: { role: 'link', name: 'Payment History' },
    expectedAction: 'Navigate to /tenant/finances',
    expect: { kind: 'url', pattern: /\/tenant\/finances/ },
    edgeCases:
      'Dashboard can throw if tenant summary RPC returns incomplete row; maintenance route is stable with mock lease',
  }),
  E({
    id: 'tn-household-join-cta',
    mapRole: 'tenant',
    pageLabel: 'Tenant · Household',
    route: '/tenant/household',
    component: 'tenant/household.tsx',
    elementDescription: 'Join with Invite Link (empty state)',
    action: 'click',
    playwright: { role: 'button', name: 'Join with Invite Link' },
    expectedAction: 'Show JoinHouseholdForm',
    expect: { kind: 'visible', text: /invite|cancel|code/i },
    edgeCases: 'Hidden when tenant already has lease; mock tenant has lease',
    skipE2e: true,
    skipE2eReason: 'Mock tenant has active lease — empty state not shown',
  }),

  // ——— Tenant messages tabs ———
  E({
    id: 'tn-msg-tab-household',
    mapRole: 'tenant',
    pageLabel: 'Tenant · Messages',
    route: '/tenant/messages',
    component: 'tenant/messages.tsx',
    elementDescription: 'Tab: Household',
    action: 'click',
    playwright: { role: 'button', name: 'Household' },
    expectedAction: 'Show household thread',
    expect: { kind: 'visible', text: /household|roommate|message/i },
    edgeCases:
      'TabsTrigger is a plain button (ui/tabs.tsx), not role=tab; requires active lease from mock',
  }),

  // ——— Tenant maintenance ———
  E({
    id: 'tn-maint-new',
    mapRole: 'tenant',
    pageLabel: 'Tenant · Maintenance',
    route: '/tenant/maintenance',
    component: 'tenant/maintenance.tsx',
    elementDescription: 'New Request',
    action: 'click',
    playwright: { role: 'button', name: 'New Request' },
    expectedAction: 'Open maintenance form',
    expect: { kind: 'visible', text: /description|cancel|category|maintenance/i },
    edgeCases: 'Empty state uses Submit Your First Request instead',
  }),

  // ——— Admin layout ———
  E({
    id: 'ad-nav-users',
    mapRole: 'admin',
    pageLabel: 'Admin · Overview',
    route: '/admin/overview',
    component: 'admin-layout.tsx',
    elementDescription: 'Sidebar: Users',
    action: 'click',
    playwright: { role: 'link', name: 'Users' },
    expectedAction: 'Navigate to users',
    expect: { kind: 'url', pattern: /\/admin\/users/ },
    edgeCases: 'Feature-flag items may be hidden',
  }),
  E({
    id: 'ad-nav-audit',
    mapRole: 'admin',
    pageLabel: 'Admin · Overview',
    route: '/admin/overview',
    component: 'admin-layout.tsx',
    elementDescription: 'Sidebar: Audit & Security',
    action: 'click',
    playwright: { role: 'link', name: 'Audit & Security' },
    expectedAction: 'Navigate',
    expect: { kind: 'url', pattern: /\/admin\/audit-security/ },
    edgeCases: '—',
  }),
  E({
    id: 'ad-overview-tab-transactions',
    mapRole: 'admin',
    pageLabel: 'Admin · Overview',
    route: '/admin/overview',
    component: 'admin/overview.tsx',
    elementDescription: 'Tab: Transactions',
    action: 'click',
    playwright: { role: 'button', name: 'Transactions' },
    expectedAction: 'Switch overview tab',
    expect: { kind: 'visible', text: /revenue|transaction|payment/i },
    edgeCases: 'TabsTrigger renders as button without role tab',
  }),

  // ——— Admin Users ———
  E({
    id: 'ad-users-tab-tenants',
    mapRole: 'admin',
    pageLabel: 'Admin · Users',
    route: '/admin/users',
    component: 'admin/users.tsx',
    elementDescription: 'Tab: Tenants',
    action: 'click',
    playwright: { role: 'button', name: /Tenants \(\d+\)/ },
    expectedAction: 'Filter list to tenant role',
    expect: { kind: 'visible', text: /Tenant accounts|Tenants/ },
    edgeCases: 'TabsTrigger is button; label includes count',
  }),
  E({
    id: 'ad-users-ban-first-row',
    mapRole: 'admin',
    pageLabel: 'Admin · Users',
    route: '/admin/users',
    component: 'admin/users.tsx',
    elementDescription: 'Row action: Ban user (icon)',
    action: 'click',
    playwright: { role: 'button', name: 'Ban user' },
    expectedAction: 'Open AdminActionModal — Ban User',
    expect: { kind: 'dialog', name: /ban user/i },
    edgeCases: 'Not shown if user already banned; picks first matching row',
    skipE2e: true,
    skipE2eReason: 'Role-dependent visibility; use admin-users spec',
  }),
  E({
    id: 'ad-users-modal-cancel',
    mapRole: 'admin',
    pageLabel: 'Admin · Users',
    route: '/admin/users',
    component: 'admin/users.tsx (AdminActionModal)',
    elementDescription: 'Modal: Cancel',
    action: 'click',
    playwright: { role: 'button', name: 'Cancel' },
    expectedAction: 'Close modal',
    expect: { kind: 'url', pattern: /\/admin\/users/ },
    edgeCases: 'button-map spec opens a row action (ban/lock/reset) before clicking Cancel',
  }),

  // ——— Admin audit ———
  E({
    id: 'ad-audit-tab-alerts',
    mapRole: 'admin',
    pageLabel: 'Admin · Audit & Security',
    route: '/admin/audit-security',
    component: 'admin/audit-security.tsx',
    elementDescription: 'Tab: Security Alerts',
    action: 'click',
    playwright: { role: 'button', name: 'Security Alerts' },
    expectedAction: 'Switch tab',
    expect: { kind: 'visible', text: /alert|severity|security/i },
    edgeCases: 'TabsTrigger renders as button (ui/tabs.tsx)',
  }),

  // ——— Admin payments ———
  E({
    id: 'ad-pay-tab-failed',
    mapRole: 'admin',
    pageLabel: 'Admin · Payments',
    route: '/admin/payments',
    component: 'admin/payments.tsx',
    elementDescription: 'Tab: Failed Transactions',
    action: 'click',
    playwright: { role: 'button', name: 'Failed Transactions' },
    expectedAction: 'Switch tab',
    expect: { kind: 'visible', text: /fail|declin|rent_records/i },
    edgeCases: 'TabsTrigger is button',
  }),

  // ——— Admin system ———
  E({
    id: 'ad-sys-test-notifications',
    mapRole: 'admin',
    pageLabel: 'Admin · System',
    route: '/admin/system',
    component: 'admin/system.tsx',
    elementDescription: 'Send test notifications',
    action: 'click',
    playwright: { role: 'button', name: /test notification/i },
    expectedAction: 'Invoke handleSendTestNotifications',
    expect: { kind: 'url', pattern: /\/admin\/system/ },
    edgeCases: 'May toast success/error',
    skipE2e: true,
    skipE2eReason: 'Side effects / edge function',
  }),

  // ——— Admin messages & support ———
  E({
    id: 'ad-msg-tab-conversations',
    mapRole: 'admin',
    pageLabel: 'Admin · Messages & Support',
    route: '/admin/messages-support',
    component: 'admin/messages-support.tsx',
    elementDescription: 'Tab: Conversations',
    action: 'click',
    playwright: { role: 'button', name: 'Conversations' },
    expectedAction: 'Switch tab',
    expect: { kind: 'visible', text: /conversation|lease|message/i },
    edgeCases: 'Default tab is Tickets; TabsTrigger is a button',
  }),

  // ——— Auth ———
  E({
    id: 'auth-login-submit',
    mapRole: 'auth',
    pageLabel: 'Auth · Login',
    route: '/login',
    component: 'auth/login.tsx',
    elementDescription: 'Sign In (submit)',
    action: 'submit',
    playwright: { role: 'button', name: 'Sign In' },
    expectedAction: 'signInWithPassword + role redirect',
    expect: { kind: 'url', pattern: /\/(landlord|tenant|admin)\// },
    edgeCases: 'Invalid creds show error; connection errors surfaced in dev',
    sessionEmail: undefined,
    skipE2e: true,
    skipE2eReason: 'Auth page tested after session established from mock login helper',
  }),
  E({
    id: 'auth-login-google',
    mapRole: 'auth',
    pageLabel: 'Auth · Login',
    route: '/login',
    component: 'auth/login.tsx',
    elementDescription: 'Sign in with Google',
    action: 'click',
    playwright: { role: 'button', name: 'Sign in with Google' },
    expectedAction: 'OAuth redirect',
    expect: { kind: 'noop' },
    edgeCases: 'External IdP',
    sessionEmail: undefined,
    skipE2e: true,
    skipE2eReason: 'External OAuth',
  }),
  E({
    id: 'auth-login-magic-toggle',
    mapRole: 'auth',
    pageLabel: 'Auth · Login',
    route: '/login',
    component: 'auth/login.tsx',
    elementDescription: 'Use magic link instead',
    action: 'click',
    playwright: { role: 'button', name: 'Use magic link instead' },
    expectedAction: 'Toggle magic-link mode',
    expect: { kind: 'visible', text: /Send Magic Link|magic/i },
    edgeCases: '—',
    sessionEmail: undefined,
  }),
  E({
    id: 'auth-signup-submit',
    mapRole: 'auth',
    pageLabel: 'Auth · Signup',
    route: '/signup',
    component: 'auth/signup.tsx',
    elementDescription: 'Create account (submit)',
    action: 'submit',
    playwright: { role: 'button', name: /sign up|create/i },
    expectedAction: 'signUp + navigate by role',
    expect: { kind: 'url', pattern: /\/(landlord|tenant|login)/ },
    edgeCases: 'Validation min length 6',
    sessionEmail: undefined,
    skipE2e: true,
    skipE2eReason: 'Creates real user / duplicates',
  }),
  E({
    id: 'auth-signup-landlord-role',
    mapRole: 'auth',
    pageLabel: 'Auth · Signup',
    route: '/signup',
    component: 'auth/signup.tsx',
    elementDescription: 'I am a: Landlord',
    action: 'click',
    playwright: { role: 'button', name: 'Landlord' },
    expectedAction: 'Set role landlord',
    expect: { kind: 'url', pattern: /\/signup/ },
    edgeCases: 'Disabled in invite flow',
    sessionEmail: undefined,
  }),
  E({
    id: 'auth-callback-shell',
    mapRole: 'auth',
    pageLabel: 'Auth · Callback',
    route: '/auth/callback',
    component: 'auth/callback.tsx',
    elementDescription: 'Completing sign in…',
    action: 'navigate',
    playwright: { role: 'button', name: 'Sign In' },
    expectedAction: 'getSession; redirect dashboard or login',
    expect: { kind: 'url', pattern: /\/(login|auth\/role-selection|landlord|tenant|admin)/ },
    edgeCases: 'No OAuth hash in test — redirects login with error state',
    sessionEmail: undefined,
    skipE2e: true,
    skipE2eReason: 'Race with auth init — use dedicated auth spec',
  }),
]

