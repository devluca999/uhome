# Dev Mode (Tenant + Landlord) — uhome

## Overview

**Dev Mode** is a comprehensive testing and demo system that provides realistic experiences for both **Tenant** and **Landlord** roles:
- End-to-End (E2E) testing with Playwright
- Visual User Acceptance Testing (UAT)
- Demo and QA environments
- Developer onboarding
- **Multi-tab real-time sync testing** (landlord in one tab, tenant in another)
- **Full feature coverage** (uploads, messaging, checklists, notifications)

### Extended Features

**Real-Time Multi-Tab Sync:**
- Changes made in one browser tab instantly appear in other tabs
- Powered by Supabase realtime subscriptions
- Test cross-role interactions (e.g., landlord creates work order → tenant sees it instantly)

**Staging Database Integration:**
- Core data (work orders, properties, leases, messages, notifications) uses staging database
- Real relationships and foreign keys
- Production-parity behavior
- Easy cleanup and reset

**Quick Login:**
- One-click demo account access from login screen
- Auto-detects dev mode from demo email addresses
- No need to manually type credentials

### Key Principles

**This is NOT static placeholder data.** All mock data:
- Flows through the same state machines as production
- Triggers the same UI updates
- Fires the same notifications
- Respects the same permissions and visibility rules
- Uses the same React hooks, reducers, and UI logic

**Production Parity:** From the frontend perspective, Tenant Dev Mode behaves identically to production.

---

## How to Enable

Dev Mode uses a **dual-gate security model** to prevent accidental activation in production:

### 1. Primary Gate: Environment Variables

Set in `.env.local`:

```bash
# Enable Tenant Dev Mode
VITE_TENANT_DEV_MODE_ENABLED=true

# Enable Landlord Dev Mode
VITE_LANDLORD_DEV_MODE_ENABLED=true
```

You can enable both, or just one depending on your needs.

**Purpose:** Prevents dev mode from being activated in production (where this variable is `false` or unset).

**When to set:**
- ✅ Local development
- ✅ Staging environments
- ✅ Demo environments
- ✅ E2E test environments
- ❌ **NEVER in production**

### 2. Secondary Trigger: URL Parameter or Quick Login

**Option A: URL Parameter**

Add `?dev=tenant` or `?dev=landlord` to any URL:

```
http://localhost:5173/tenant/dashboard?dev=tenant
http://localhost:5173/landlord/dashboard?dev=landlord
```

**Option B: Quick Login Buttons (Recommended)**

1. Visit the login page (`/login`)
2. Click "Demo Tenant" or "Demo Landlord" button
3. Automatically logged in with dev mode active
4. URL parameter is added automatically

**Option C: Auto-Detection**

If you manually type a demo email:
- `demo-tenant@uhome.internal` → Auto-activates tenant dev mode
- `demo-landlord@uhome.internal` → Auto-activates landlord dev mode

**Purpose:** Allows runtime toggling without rebuilds. Great for:
- Quick demos
- Screen recordings
- QA testing
- E2E test runs
- Multi-tab testing

### Enablement Logic

Both gates must be true:

```typescript
const isActive = 
  (VITE_TENANT_DEV_MODE_ENABLED === 'true') && 
  (URL parameter ?dev=tenant is present)
```

**Security:**
- Production cannot enable dev mode (env var is false)
- Dev/staging can toggle easily (URL param)
- No rebuilds required to switch modes

---

## Mock Data Scenarios

### Tenant Dev Mode Scenario

Tenant Dev Mode creates a complete "happy path" tenant lifecycle with realistic data.

### Tenant Account

```
Email: demo-tenant@uhome.internal
Password: DemoTenant2024!
```

**Note:** You can log in as this account, OR dev mode will automatically inject mock data when the URL parameter is present (even without logging in).

### Property

- **Name:** Sunrise Apartments - Unit 3B
- **Address:** 1234 Oak Street, Portland, OR 97201
- **Monthly Rent:** $1,450
- **Rent Due:** 1st of month
- **Utilities:** Water and trash included
- **Rules:** Quiet hours 10 PM - 7 AM

### Lease

- **Lease Start:** 6 months ago
- **Lease End:** 6 months from now (active lease)
- **Rent Amount:** $1,450/month
- **Lease Type:** Long-term
- **Security Deposit:** $1,450

### Work Orders (3 Different States)

#### 1. Work Order A — Submitted

- **Category:** Plumbing
- **Description:** "Kitchen sink is leaking underneath. Water pooling in cabinet."
- **Status:** `submitted`
- **Created:** 2 days ago
- **Created By:** Tenant
- **Visible To:** Tenant sees "Submitted" status
- **Next State:** Awaiting landlord review

#### 2. Work Order B — Scheduled

- **Category:** HVAC
- **Description:** "Heating not working properly. Temperature drops below 65°F at night."
- **Status:** `scheduled`
- **Created:** 1 week ago
- **Scheduled Date:** 3 days from now, 10:00 AM
- **Created By:** Tenant
- **Visible To:** Tenant sees "Scheduled" badge + date
- **Next State:** In progress (when landlord starts work)

#### 3. Work Order C — Resolved

- **Category:** Electrical
- **Description:** "Living room outlet not working (left wall near window)."
- **Status:** `resolved`
- **Created:** 3 weeks ago
- **Resolved:** 2 days ago
- **Created By:** Tenant
- **Internal Notes:** "Replaced outlet, circuit breaker tripped"
- **Visible To:** Tenant sees resolution summary
- **Tenant Actions:**
  - "Confirm Resolved" → transitions to `closed`
  - "Still an Issue" → adds note, notifies landlord

### Notifications

Tenant Dev Mode includes 3 notifications:

#### 1. Notification (Unread)
- **Type:** work_order
- **Body:** "Maintenance has been scheduled for: Heating not working properly..."
- **Related:** Work Order B
- **Created:** 1 week ago
- **Read:** No

#### 2. Notification (Read)
- **Type:** work_order
- **Body:** "Work order has been resolved. Please confirm if the issue is fixed: Living room outlet..."
- **Related:** Work Order C
- **Created:** 2 days ago
- **Read:** Yes

#### 3. Notification (Unread)
- **Type:** work_order
- **Body:** "Your landlord has reviewed your work order: Kitchen sink is leaking..."
- **Related:** Work Order A
- **Created:** 1 day ago
- **Read:** No

---

## State Persistence

Tenant Dev Mode uses a **hybrid persistence model**:

### 1. Initial Seed

When dev mode first activates:
- Loads seed data from `generateSeedState()` in `src/lib/mock-state-store.ts`
- Seed data is deterministic and predictable
- Perfect for repeatable E2E tests

### 2. Runtime Mutations

When you interact with the UI:
- Status changes, confirmations, and actions update the **in-memory store**
- Changes are immediately **persisted to localStorage**
- State survives page refreshes

### 3. localStorage Key

```typescript
TENANT_DEV_MODE_STORAGE_KEY = 'tenant-dev-mode-state'
```

### 4. State Shape

```typescript
interface TenantDevModeState {
  version: string                     // '1.0.0' - for migration/invalidation
  tenantData: MockTenantData          // Property, lease, tenant info
  workOrders: MockMaintenanceRequest[] // 3 work orders
  notifications: MockNotification[]    // 3 notifications
  lastUpdated: string                  // ISO timestamp
  isDirty: boolean                     // true if modified from seed
}
```

### Reset State

To reset to seed data:

```typescript
// In code:
import { resetState } from '@/lib/mock-state-store'
resetState()

// In browser console:
localStorage.removeItem('tenant-dev-mode-state')
window.location.reload()
```

---

## Dynamic State Transitions

Mock data respects the same state machine as production.

### Work Order State Machine

**Tenant-created flow:**
```
submitted → seen → scheduled → in_progress → resolved → closed
```

### Tenant Actions

#### 1. Confirm Resolution

When work order is in `resolved` status:
- Tenant clicks "Confirm Resolved"
- Status transitions to `closed`
- Update persists to localStorage
- No new notification (already resolved)

#### 2. Flag "Still an Issue"

When work order is in `resolved` status:
- Tenant clicks "Still an Issue"
- Adds note to work order
- Mock notification generated (not shown to tenant)
- Work order stays in `resolved` state

### Notification Generation

When work order status changes in dev mode, notifications are dynamically generated:

- `submitted → seen`: "Your landlord has reviewed your work order"
- `seen → scheduled`: "Maintenance has been scheduled"
- `scheduled → in_progress`: (optional notification)
- `in_progress → resolved`: "Work order has been resolved. Please confirm..."

**Implementation:** See `generateNotificationForStatusChange()` in `src/lib/mock-state-store.ts`

---

## For Developers

### Where Mock Data is Injected

Mock data is injected at the **React hook layer**:

#### 1. `src/hooks/use-tenant-data.ts`

```typescript
if (devMode?.isActive && devMode.state) {
  // Return mock tenant + property data
  setData(devMode.state.tenantData)
  return
}

// Otherwise: fetch from Supabase
```

#### 2. `src/hooks/use-maintenance-requests.ts`

```typescript
if (devMode?.isActive && devMode.state) {
  // Return mock work orders
  setRequests(devMode.state.workOrders)
  return
}

// Otherwise: fetch from Supabase
```

#### 3. `src/hooks/use-notifications.ts`

```typescript
if (devMode?.isActive && devMode.state) {
  // Return mock notifications
  setNotifications(devMode.state.notifications)
  return
}

// Otherwise: fetch from Supabase
```

### State Management

Mock state is managed via React Context:

- **Context:** `src/contexts/tenant-dev-mode-context.tsx`
- **Store:** `src/lib/mock-state-store.ts`
- **Feature Flag:** `src/lib/tenant-dev-mode.ts`

### Adding New Mock Scenarios

To add new mock data scenarios:

1. **Modify seed:** Update `generateSeedState()` in `src/lib/mock-state-store.ts`
2. **Increment version:** Change `TENANT_DEV_MODE_VERSION` to invalidate old localStorage
3. **Test:** Clear localStorage and verify new seed loads

### Database Seeding (Optional)

For fully realistic testing, seed the database with demo tenant:

```bash
npm run seed:tenant-dev
```

This creates:
- Demo landlord account
- Demo property
- Demo tenant account
- Active lease
- 3 work orders (submitted, scheduled, resolved)
- 3 notifications (2 unread, 1 read)

**Note:** Seeding is optional. Dev mode works without database seed by using in-memory mock data.

---

## For E2E Tests

### Test Helpers

Use the helpers in `tests/helpers/tenant-dev-mode-helpers.ts`:

```typescript
import {
  setupTenantDevMode,
  teardownTenantDevMode,
  verifyMockDataLoaded,
  getMockWorkOrders,
  clickConfirmResolution,
  verifyWorkOrderStatus,
} from '../helpers/tenant-dev-mode-helpers'

test('should confirm resolution', async ({ page }) => {
  await setupTenantDevMode(page)
  
  // ... test logic
  
  await teardownTenantDevMode(page)
})
```

### Key Helper Functions

- `setupTenantDevMode(page)` — Reset state, enable dev mode
- `teardownTenantDevMode(page)` — Clean up after test
- `resetTenantDevModeState(page)` — Clear localStorage
- `getMockWorkOrders(page)` — Get work orders from localStorage
- `getMockNotifications(page)` — Get notifications from localStorage
- `verifyMockDataLoaded(page)` — Assert mock data exists
- `clickConfirmResolution(page, id)` — Click "Confirm Resolved" button
- `verifyWorkOrderStatus(page, id, status)` — Assert status badge text
- `verifyStatePersistsAfterRefresh(page)` — Verify persistence

### Test Selectors

Work orders:
- `data-testid="work-order-card-{id}"`
- `data-testid="work-order-status-badge-{id}"`
- `data-testid="confirm-resolution-btn-{id}"`
- `data-testid="flag-issue-btn-{id}"`

Dashboard:
- `data-testid="pending-work-orders-count"`
- `data-testid="rent-status"`

Notifications:
- `data-testid="notification-item-{id}"`
- `data-testid="notification-unread-count"`

### Reset Between Tests

Always reset state before each test:

```typescript
test.beforeEach(async ({ page }) => {
  await setupTenantDevMode(page)
})

test.afterEach(async ({ page }) => {
  await teardownTenantDevMode(page)
})
```

### Expected Data Structure

Mock state always includes:
- **3 work orders** (submitted, scheduled, resolved)
- **3 notifications** (2 unread, 1 read)
- **1 tenant** with property and lease
- Deterministic IDs (predictable for testing)

---

## For QA/UAT

### How to Access

1. **Set environment variable:**
   ```bash
   VITE_TENANT_DEV_MODE_ENABLED=true
   ```

2. **Add URL parameter:**
   ```
   http://your-app.com/tenant/dashboard?dev=tenant
   ```

3. **Verify dev mode active:**
   - URL should show `?dev=tenant`
   - Mock data should appear (3 work orders, property info, notifications)

### Testing All Work Order States

#### Submitted (Work Order A)
- Status badge: "Submitted"
- No scheduled date
- Awaiting landlord review

#### Scheduled (Work Order B)
- Status badge: "Scheduled"
- Scheduled date: 3 days from now
- Maintenance planned

#### Resolved (Work Order C)
- Status badge: "Awaiting your confirmation"
- Two action buttons visible:
  - "Confirm Resolved" → closes work order
  - "Still an Issue" → flags issue

### Verify Notifications

1. Check notification bell (should show unread count: 2)
2. Open notification dropdown
3. Verify 3 notifications appear
4. Click one to mark as read
5. Verify count updates

### Reset if State Gets Corrupted

If mock data seems broken or incorrect:

1. **Open browser console:**
   ```javascript
   localStorage.removeItem('tenant-dev-mode-state')
   ```

2. **Refresh page:**
   ```
   Press Ctrl+R (Windows) or Cmd+R (Mac)
   ```

3. **Verify seed reloads:**
   - Should see 3 work orders again
   - Status should be back to original (submitted, scheduled, resolved)

---

## Troubleshooting

### Dev Mode Not Activating

**Problem:** Mock data not appearing, seeing real data or empty state.

**Solutions:**
1. Verify environment variable is set: `VITE_TENANT_DEV_MODE_ENABLED=true`
2. Verify URL parameter is present: `?dev=tenant`
3. Check browser console for errors
4. Restart dev server if env var was just added

### State Not Persisting

**Problem:** Changes reset after page refresh.

**Solutions:**
1. Check browser localStorage is enabled
2. Verify localStorage key exists: `tenant-dev-mode-state`
3. Check browser console for persistence errors

### Wrong Work Order Count

**Problem:** Seeing more or fewer than 3 work orders.

**Solutions:**
1. Reset state: `localStorage.removeItem('tenant-dev-mode-state')`
2. Refresh page to reload seed
3. Verify version match (old cached data may be invalidated)

### Status Transitions Not Working

**Problem:** Clicking "Confirm Resolved" doesn't change status.

**Solutions:**
1. Check browser console for state machine validation errors
2. Verify work order is in `resolved` status (only resolved can be confirmed)
3. Ensure no JavaScript errors blocking state updates

---

## Production Safety

### Guards in Place

1. **Environment Variable:** Production deployments should NEVER set `VITE_TENANT_DEV_MODE_ENABLED=true`
2. **URL Parameter Required:** Even if env var leaked, user must add `?dev=tenant`
3. **No Backend Bypass:** Dev mode only affects frontend data layer, all real APIs remain unchanged

### Deployment Checklist

Before deploying to production:

- [ ] Verify `VITE_TENANT_DEV_MODE_ENABLED` is `false` or unset
- [ ] Test that `?dev=tenant` parameter does nothing in production
- [ ] Confirm no dev mode code paths execute in production builds

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│ Environment Variable Gate               │
│ VITE_TENANT_DEV_MODE_ENABLED = true     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ URL Parameter Trigger                   │
│ ?dev=tenant                             │
└─────────────────┬───────────────────────┘
                  │
                  ▼ (Both True)
┌─────────────────────────────────────────┐
│ React Context Provider                  │
│ TenantDevModeProvider                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Mock State Store                        │
│ - generateSeedState()                   │
│ - loadState() from localStorage         │
│ - persistState() to localStorage        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ React Hooks (Data Injection Layer)     │
│ - use-tenant-data.ts                    │
│ - use-maintenance-requests.ts           │
│ - use-notifications.ts                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Production UI Components                │
│ (No changes - works with mock or real)  │
└─────────────────────────────────────────┘
```

---

## Landlord Dev Mode

Landlord Dev Mode provides the same comprehensive testing experience for landlords.

### Landlord Scenario

- **2 Properties:**
  - Sunrise Apartments - Unit 3B ($1,450/month)
  - Maple Apartments - Unit 2A ($1,800/month)
- **1 Tenant** assigned to Property 1
- **4 Work Orders:**
  - 3 tenant-created (submitted, scheduled, resolved)
  - 1 landlord-created (scheduled, Property 2)
- **Tasks/Checklists:**
  - Move-in checklist assigned to tenant
- **Messages:**
  - Initial welcome messages in lease thread
- **Notifications:**
  - Work order updates
  - Tenant activity

### Usage

Same enablement as Tenant Dev Mode, but use `?dev=landlord` or click "Demo Landlord" button.

---

## Multi-Tab Real-Time Sync

Dev Mode supports **real-time multi-tab synchronization** powered by Supabase realtime subscriptions.

### How It Works

1. **Staging Database:** Core data (work orders, messages, tasks, notifications) is stored in the staging database
2. **Realtime Subscriptions:** Hooks subscribe to table changes via Supabase realtime
3. **Cross-Tab Updates:** Changes in one tab instantly appear in other tabs
4. **No Polling:** Event-driven updates, no manual refresh needed

### Testing Scenarios

**Scenario 1: Work Order Creation**
- Landlord creates work order in Tab A
- Tenant sees new work order instantly in Tab B

**Scenario 2: Status Updates**
- Tenant confirms resolution in Tab A
- Landlord sees status change instantly in Tab B

**Scenario 3: Messaging**
- Tenant sends message in Tab A
- Landlord receives message instantly in Tab B

**Scenario 4: Document Uploads**
- Tenant uploads image in Tab A
- Landlord sees new document instantly in Tab B

**Scenario 5: Checklist Completion**
- Tenant completes checklist item in Tab A
- Landlord sees completion instantly in Tab B

### Setting Up Multi-Tab Testing

1. **Seed the database:**
   ```bash
   npm run seed:full-dev
   ```

2. **Open two browser tabs:**
   - Tab 1: Login as `demo-landlord@uhome.internal` with `?dev=landlord`
   - Tab 2: Login as `demo-tenant@uhome.internal` with `?dev=tenant`

3. **Perform actions in one tab** and watch them appear in the other tab instantly

### Technical Details

**Realtime Hooks:**
- `use-realtime-subscription.ts` — Generic subscription hook
- Integrated into:
  - `use-maintenance-requests.ts` — Work order changes
  - `use-lease-messages.ts` — Message changes
  - `use-notifications.ts` — Notification changes
  - `use-tasks.ts` — Task/checklist changes
  - `use-documents.ts` — Document changes

**Configuration:**
- Events per second: 10 (configurable in `src/lib/supabase/client.ts`)
- Automatic cleanup on unmount
- Dev mode only (production uses normal Supabase queries)

---

## Data Strategy

### Staging Database (Core Data)

The following data uses the **staging database** (not localStorage):
- Users (demo accounts)
- Properties
- Households
- Leases
- Work Orders
- Messages
- Notifications
- Tasks/Checklists
- Documents (metadata)

**Benefits:**
- Real relationships (foreign keys work)
- Real-time subscriptions work
- Multi-tab sync automatic
- Production-parity behavior

### localStorage (UI-Only State)

The following uses **localStorage** (dev-only enhancements):
- Dashboard filters
- Modal open/close state
- User preferences
- Transient UI state

### Upload Metadata

Documents uploaded in dev mode are tagged with metadata:
- `dev_mode: true`
- `role: tenant | landlord`
- `entity_type: property | lease | work_order | checklist`
- `entity_id: <id>`

This enables easy cleanup of dev uploads if needed.

---

## Related Documentation

- [Mock Mode Philosophy](mock_mode_philosophy.md) — General mock mode principles
- [E2E Testing](e2e-testing.md) — Full E2E testing guide
- [Environment Setup](environment_setup.md) — Environment variable configuration
- [Tenant Lifecycle](tenant-lifecycle.md) — Tenant workflow documentation

---

## Developer Expectations

**Mock ≠ Shortcut**

Tenant Dev Mode is not a simplified version of the app. It simulates production behavior exactly:

- ✅ Same state machines
- ✅ Same validation rules
- ✅ Same UI components
- ✅ Same notifications
- ✅ Same permission checks

**If it works in dev mode, it must work in production.**

Any deviation is a bug.

