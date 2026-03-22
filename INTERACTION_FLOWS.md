# INTERACTION_FLOWS.md
# uhome Platform - Complete Interaction & Flow Mapping

**Version:** 1.0.0  
**Last Updated:** 2025-03-22  
**Purpose:** Single source of truth for all user interactions, component behaviors, and expected system states

---

## Document Structure

This document maps every possible user action, UI interaction, and system response across the uhome platform, organized by:

1. **User Role** (Landlord, Tenant, Admin)
2. **Feature Area** (Dashboard, Properties, Finances, etc.)
3. **Component** (Specific UI elements)
4. **Action** (User interaction)
5. **Expected Behavior** (System response)
6. **Edge Cases** (Error states, empty states, concurrent actions)

**Navigation:**
- [Landlord Flows](#landlord-flows)
- [Tenant Flows](#tenant-flows)
- [Admin Flows](#admin-flows)
- [Shared Components](#shared-components)
- [State Management](#state-management)
- [Test Coverage Matrix](#test-coverage-matrix)

---

## Landlord Flows

### Dashboard (`/landlord/dashboard`)

#### KPI Cards - Portfolio Metrics

**Component:** `PortfolioCard` with `ModalIndicator`

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| Click "Properties" card | Opens `PropertiesDistributionModal` showing property breakdown by type/location | Empty state: Shows "No properties" message | ✅ `tests/visual/dashboard.spec.ts` |
| Click "Tenants" card | Opens `TenantDistributionModal` with tenant list, lease status, contact info | No tenants: Shows "Add your first tenant" CTA | ✅ `tests/e2e/landlord/dashboard-sync.spec.ts` |
| Click "Occupancy" card | Opens `OccupancyBreakdownModal` with occupancy rate by property | 0% occupancy: Shows "All units vacant" message | ✅ |
| Click "Revenue" card | Opens `RevenueBreakdownModal` with rent collection details | No revenue: Shows "No rent collected yet" | ✅ |
| Click "Tasks" card | Opens `TaskDistributionModal` with task status breakdown | No tasks: Shows "All caught up!" | ✅ |
| Click "Work Orders" card | Opens `WorkOrdersPreviewModal` with maintenance request list | No requests: Shows "No open work orders" | ⚠️ Partial |

**State Dependencies:**
- Requires data from: `useProperties`, `useTenants`, `useMaintenanceRequests`, `useLandlordRentRecords`
- Loading state: Shows skeleton loader for all cards
- Error state: Shows `ErrorAlert` component above affected cards

---

#### Financial Summary Section

**Component:** `MetricCard` (Net Income, Total Expenses, Projected Net)

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| Click "Net Income" | Opens `ProfitBreakdownModal` with income/expense breakdown | Negative net income: Card shows red variant | ✅ |
| Click "Total Expenses" | Opens `ExpenseDistributionModal` with category breakdown | No expenses: Shows "No expenses recorded" | ✅ |
| View "Projected Net" | Static display (no click action) | Negative projection: Shows warning color | ✅ |
| Change timeline dropdown (Monthly/Quarterly/Yearly) | All metrics recalculate and update with animation | Mid-calculation: Shows loading spinner | ✅ |

**Calculations:**
```typescript
// Net Income Formula
netIncome = periodRevenue - periodExpenses

// Profit Margin Formula
marginPercentage = (netIncome / periodRevenue) * 100

// Projected Net Formula (30-day window)
projectedNet = expectedRent - averageExpenses
```

**State Management:**
- Settings stored in `useSettings` context
- Timeline selection persists across sessions
- Triggers refetch of all financial hooks

---

#### Property Profitability Section

**Component:** `ProfitMarginCard` inside `CollapsibleSection` (`id="dashboard-property-profitability"`)

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| View profitability cards | Displays net profit, margin % for each property | No properties: Section hidden | ✅ |
| Hover over card | Subtle scale animation | Mobile: No hover effect | ⚠️ Visual only |
| Click collapse icon | Collapses/expands section; preference persists with other collapsibles | — | ✅ Implemented in `src/pages/landlord/dashboard.tsx` |

---

#### Smart Insights Section

**Component:** `SmartInsightCard` within `CollapsibleSection`

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| Click collapse icon | Collapses/expands insights section, state persists | No insights: Section hidden | ✅ |
| View insight cards | Shows color-coded insights (success/info/warning) | Multiple warnings: All visible | ✅ |
| Hover over card | Subtle highlight | Mobile: No hover | ⚠️ |

**Insight Generation Logic:**
- Collection rate > 90%: Success insight
- Collection rate 70-90%: Info insight
- Collection rate < 70%: Warning insight
- High property upkeep (>1.5x average): Warning per property
- Overdue payments: Warning with count

---

#### Recent Activity Section

**Component:** `ActivityFeedItem` list within `CollapsibleSection`

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| Click collapse icon | Collapses/expands activity section | No activity: Shows "No recent activity" | ✅ |
| Click "View All" (if >5 items) | Opens `RecentActivityModal` with full list | Exactly 5 items: Button not shown | ✅ |
| Click card background | Opens modal if activity items exist | Empty state: No click action | ✅ |
| View activity item | Shows icon, title, timestamp | Different activity types: Different icons | ✅ |

**Activity Types:**
- Rent payments
- Expense additions
- Maintenance requests
- Tenant assignments
- Document uploads
- Lease updates

---

### Properties Page (`/landlord/properties`)

#### Property List View

**Component:** `PropertyCard` grid

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| Click "Add Property" | Opens property creation modal/form | First property: Special onboarding flow | ✅ |
| Click property card | Navigates to `/landlord/properties/:id` detail view | Invalid ID: 404 error page | ✅ |
| Click "Edit" on card | Opens property edit modal with pre-filled data | Concurrent edits: Last write wins | ⚠️ Race condition |
| Click "Delete" on card | Shows confirmation dialog → cascading delete warning | Has active leases: Prevents deletion with error | ✅ |
| Filter properties | Filters list by type/status/location | No matches: Shows "No properties found" | ⚠️ Filter not implemented yet |
| Search properties | Searches by name/address | No matches: Shows empty state | ⚠️ Search not implemented yet |

**Cascading Delete Logic:**
```
Property deletion checks:
1. Has active leases? → Block deletion, show error
2. Has historical data? → Soft delete (mark inactive)
3. No dependencies → Hard delete allowed
```

---

#### Property Creation Flow

**Component:** Multi-step form modal

| Step | User Action | Expected Behavior | Edge Cases | Test Coverage |
|------|-------------|-------------------|------------|---------------|
| 1 | Enter basic info (name, address, type) | Validates required fields | Duplicate address: Warning (not error) | ✅ |
| 2 | Add units (count, rent amounts) | Validates rent > 0 | Single-family: Skip this step | ✅ |
| 3 | Upload images (optional) | Uploads to Supabase storage | Upload fails: Shows retry option | ⚠️ Partial |
| 4 | Review & submit | Creates property → redirects to detail view | Network error: Shows error, allows retry | ✅ |

**Validation Rules:**
- Name: Required, 1-100 characters
- Address: Required, 5-200 characters
- Type: Required, one of: Single-Family, Multi-Family, Condo, Townhouse, Other
- Units: Min 1, max 1000
- Rent per unit: Min $0.01, max $999,999.99

---

### Tenants Page (`/landlord/tenants`)

#### Tenant Invitation Flow (CRITICAL - VERIFY THIS WORKS)

**Component:** `TenantInviteForm`

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| Click "Invite Tenant" | Opens invite form modal | No properties: Shows error "Create property first" | ✅ |
| Enter email | Validates email format | Email already exists: Shows "Tenant already in system" | ⚠️ Needs verification |
| Select property/unit | Dropdown of available (vacant) units | All units occupied: Shows "No vacant units" | ✅ |
| Click "Send Invite" | Creates invite record → sends email → generates token | Email service down: Shows error, saves draft | ❌ **NEEDS TEST** |
| Copy invite link | Copies link to clipboard | Clipboard API fails: Shows manual copy textarea | ⚠️ |

**🔴 CRITICAL: Verify Invite Link Format**
```typescript
// Expected formats:
const inviteFormats = [
  'https://uhome.app/accept-invite?token=<uuid>',  // Primary
  '/accept-invite?token=<uuid>',                    // Relative
  'accept-invite/<uuid>',                           // Legacy
  '<uuid>'                                          // Token only
]

// Token generation:
token = crypto.randomUUID()
expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
```

**Database Schema:**
```sql
CREATE TABLE tenant_invites (
  id UUID PRIMARY KEY,
  landlord_id UUID REFERENCES users(id),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, expired
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Finances Page (`/landlord/finances`)

**Component:** Financial ledger and charts

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| View ledger | Displays all transactions (rent + expenses) paginated | No transactions: Shows "No financial activity" | ✅ |
| Filter by date range | Updates ledger and charts | Empty range: Shows "No data in range" | ✅ |
| Filter by property | Shows transactions for selected property | Property with no transactions: Empty state | ✅ |
| Export to CSV | Downloads CSV with all visible transactions | Large dataset: Shows loading, chunks export | ⚠️ Needs testing |
| Click "Add Expense" | Opens expense creation modal | Concurrent adds: All succeed independently | ✅ |
| Click "Log Rent" | Opens rent logging modal with tenant selector | No active leases: Shows "No tenants to log rent for" | ✅ |

---

## Tenant Flows

### Onboarding - Accept Invite (`/accept-invite`)

**Component:** `AcceptInvite` — [`src/pages/auth/accept-invite.tsx`](src/pages/auth/accept-invite.tsx)  
**Route:** Registered in [`src/router/index.tsx`](src/router/index.tsx) as `path: 'accept-invite'` (public).

| Step | User Action | Expected Behavior | Edge Cases | Test Coverage |
|------|-------------|-------------------|------------|---------------|
| 1 | Land on `/accept-invite?token=<uuid>` | Fetches invite via `getInviteByToken` | Invalid / expired / used: Error UI + clears stale `pending_invite_token` when applicable | ✅ E2E: `tests/e2e/critical-path/tenant-invite-join.spec.ts`, `tenant-invite-cold-signup.spec.ts` |
| 2 | URL missing `token` but `sessionStorage` has pending invite | Redirects to `/accept-invite?token=…` (resume) | No pending token: "Missing invite token" | ✅ Client recovery in `AcceptInvite` |
| 3 | View invite details | Property name, address, invited email | — | ✅ |
| 4 | Click "Accept Invite" (logged in) | Role → tenant, tenant row, lease update, `accepted_at` set, redirect `/tenant/dashboard` | Wrong email, bad lease state: Inline error | ✅ E2E (above) |
| 5 | Not logged in | "Sign Up First" / flow stores pending token → signup → resume | — | ✅ `tenant-invite-cold-signup.spec.ts` |

**Implementation notes:** Token validation and lease activation live in `AcceptInvite` + [`useTenantInvites.getInviteByToken`](src/hooks/use-tenant-invites.ts). Optional React Router `loader` is not used; validation is client-side after load.

---

### Household Page (`/tenant/household`)

**Component:** `TenantHousehold` with `JoinHouseholdForm`

#### Case 1: No Active Lease (Join Flow)

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| View page | Shows "Join Household" empty state with CTA | Multiple pending invites: Shows newest | ⚠️ |
| Click "Join Household" | Shows `JoinHouseholdForm` | No invites exist: Shows "Contact your landlord" | ⚠️ |
| Paste invite link | Extracts token via `extractTokenFromInviteInput` ([`src/lib/invite-token.ts`](src/lib/invite-token.ts)) | Invalid format: Clear error copy | ✅ Unit: `tests/unit/invite-token.spec.ts` |
| Click "Submit" | Navigates to `/accept-invite?token=<uuid>` | Bad input: Stays on form with error | ✅ |

**Token parsing:** Supports full URL with `?token=`, path `/accept-invite/<token>`, legacy path segments, and raw UUID-like tokens. See unit tests for edge cases.

#### Case 2: Active Lease Exists (Normal View)

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| View "Home" tab | Shows `PropertyDetailsCard` with property info | No property images: Shows placeholder | ✅ |
| View "Housemates" tab | Shows `HousematesList` with other tenants | Solo tenant: Shows "No housemates" | ✅ |
| View "Contact" tab | Shows `LandlordContactCard` with landlord info | Landlord no phone: Only shows email | ✅ |

---

## Admin Flows

### Admin Dashboard (`/admin/dashboard`)

**Component:** Admin metrics and actions

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| View platform stats | Shows total users, properties, active leases | Fresh instance: All zeros | ⚠️ Needs testing |
| View system health | Shows DB status, API latency, error rates | Degraded performance: Shows warnings | ❌ Not implemented |
| Quick actions panel | Provides shortcuts to user management, audits | Insufficient permissions: Actions disabled | ⚠️ |

---

### User Management (`/admin/users`)

**Component:** User list with actions

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| Search users | Filters by email/name | No matches: Empty state | ✅ |
| Click "Ban User" | Shows confirmation → bans user → logs action | User already banned: Shows error | ✅ |
| Click "Unban User" | Unbans user → logs action | User not banned: Shows error | ✅ |
| Click "Lock Account" | Locks user out → logs action | User already locked: Shows error | ✅ |
| Click "Unlock Account" | Unlocks account → logs action | User not locked: Shows error | ✅ |
| Click "Reset Password" | Sends password reset email → logs action | Email fails: Shows error, allows retry | ⚠️ |
| Click "Delete User" | **Requires confirmation with "DELETE" typed** → cascades delete | Has dependencies: Shows warning | ✅ |

**Action Logging:**
Every admin action must create an audit log entry:
```typescript
{
  admin_id: user.id,
  action: 'ban_user',
  target_id: targetUser.id,
  metadata: { reason: 'TOS violation' },
  ip_address: request.ip,
  created_at: NOW()
}
```

---

### Audit Logs (`/admin/audit`)

**Component:** Filterable audit log viewer

| User Action | Expected Behavior | Edge Cases | Test Coverage |
|-------------|-------------------|------------|---------------|
| View logs | Shows paginated audit trail (newest first) | No logs: Empty state | ✅ |
| Filter by action type | Shows only selected action types | No matches: Empty state | ✅ |
| Filter by date range | Shows logs in range | Invalid range: Shows error | ✅ |
| Search by email | Searches target user email | No matches: Empty state | ✅ |
| Export logs | Downloads CSV of visible logs | Large dataset: Chunks download | ❌ Not implemented |

---

## Shared Components

### Notification System

#### Notification Dropdown

**Component:** [`NotificationDropdown`](src/components/ui/notification-dropdown.tsx) — panel is **portaled** to `document.body` with **fixed** positioning from trigger `getBoundingClientRect()` (avoids header/sidebar clipping).

| User Action | Expected Behavior | Test Coverage |
|-------------|-------------------|---------------|
| Click bell icon | Opens panel below trigger with margin | ✅ E2E: `tests/e2e/notifications/notification-routing.spec.ts` (smoke) |
| View notifications | Lists recent items (dropdown shows slice; full list on page) | ✅ |
| Click notification | Marks read if needed, navigates | ✅ |
| Click "Mark all read" | Updates read state | ⚠️ Network errors: inline message in hook consumer |
| Click "View all notifications" | Navigates to `/landlord/notifications` or `/tenant/notifications` by role | ✅ E2E (above) |

#### Notifications Page

**Paths:** `/landlord/notifications`, `/tenant/notifications` — [`src/pages/notifications.tsx`](src/pages/notifications.tsx).

**Current features:** Full list, mark-as-read links, mark all read. Filters / delete / search can be future enhancements (see verification report).

---

## State Management Patterns

### Context Providers

**Global State:**
```
<ThemeProvider>           # Theme (light/dark/system)
  <AuthProvider>          # Authentication + user role
    <SettingsProvider>    # User preferences
      <App>
        {/* Route components */}
      </App>
    </SettingsProvider>
  </AuthProvider>
</ThemeProvider>
```

**State Access:**
```typescript
// Auth
const { user, role, signOut } = useAuth()

// Settings
const { settings, updateSettings } = useSettings()

// Theme
const { theme, setTheme } = useTheme()
```

---

### Data Fetching Hooks

**Pattern:**
All data hooks follow this structure:
```typescript
export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchProperties()
  }, [dependencies])

  return { properties, loading, error, refetch: fetchProperties }
}
```

**Available Hooks:**
- `useProperties()` - Landlord's properties
- `useTenants()` - Landlord's tenants
- `useLeases()` - Lease data
- `useMaintenanceRequests()` - Work orders
- `useRentRecords()` - Rent payment history
- `useExpenses()` - Expense tracking
- `useDocuments()` - Document storage
- `useTasks()` - Task management
- `useActiveLease()` - Tenant's active lease

---

## Test Coverage Matrix

### E2E Test Status

| Feature Area | Test File | Coverage | Status |
|--------------|-----------|----------|--------|
| Auth | `tests/auth/*.spec.ts` | Login, Signup, Role routing | ✅ Passing |
| Landlord Dashboard | `tests/e2e/landlord/*.spec.ts` | KPIs, modals, timeline | ✅ Mostly passing |
| Property Management | `tests/e2e/landlord/properties.spec.ts` | CRUD operations | ✅ Passing |
| Tenant Dashboard | `tests/e2e/tenant/*.spec.ts` | Basic views | ⚠️ Webkit failing |
| **Tenant Onboarding / Invites** | `tests/e2e/critical-path/tenant-invite-join.spec.ts`, `tenant-invite-cold-signup.spec.ts` | Invite create → accept; cold signup → accept | ✅ |
| Invite token parsing | `tests/unit/invite-token.spec.ts` | URL / path / raw token | ✅ |
| Financial Tracking | `tests/e2e/financial/*.spec.ts` | Rent, expenses | ✅ Passing |
| Admin Actions | `tests/e2e/admin/*.spec.ts` | User management | ⚠️ Webkit failing |
| **Notifications** | `tests/e2e/notifications/notification-routing.spec.ts` | Dropdown → View all → notifications page URL | ✅ Smoke |
| Rate Limiting | `tests/e2e/abuse/*.spec.ts` | Anti-abuse measures | ⚠️ Flaky |
| Work Orders | `tests/e2e/work-orders/*.spec.ts` | Maintenance flow | ✅ Passing |

**Legend:**
- ✅ Fully tested and passing
- ⚠️ Partial coverage or flaky
- ❌ Not tested / missing

---

## Edge Cases & Error Scenarios

### Concurrent Actions

**Scenario:** Two landlords editing same tenant simultaneously

**Expected:** Last write wins, no data loss

**Current:** ⚠️ Needs testing

**Solution:** Optimistic locking or version field

---

### Offline Behavior (PWA)

**Scenario:** User loses internet connection

**Expected:**
- Cached pages still viewable
- Actions queue for later sync
- User sees "Offline" indicator

**Current:** ⚠️ PWA setup exists but offline-first not fully implemented

---

### Rate Limiting Triggers

**Scenario:** User exceeds rate limits

**Expected:**
- Friendly error message
- Countdown to retry
- No data loss

**Current:** ✅ Implemented with test coverage

---

## Documentation Maintenance

**Update Triggers:**
- New feature added → Document flows
- Bug fixed → Update expected behavior
- Test added → Update coverage matrix
- UX change → Update interaction details

**Review Schedule:**
- Weekly: Check for undocumented changes
- Monthly: Comprehensive review
- Pre-release: Full audit

**Owner:** Engineering team (rotating weekly)

---

**End of INTERACTION_FLOWS.md**
