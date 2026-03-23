# uhome - Immediate Action Plan
## Week of March 22, 2025

**P2 CTO Agent - Critical Path to Launch**

---

## 🔴 CRITICAL FIXES (This Week - 8-12 Hours Total)

### Fix 1: Property Profitability Collapsible Section
**Priority:** P1 - UX Consistency  
**Effort:** 30 minutes  
**Owner:** TBD

**File:** `src/pages/landlord/dashboard.tsx`  
**Line:** ~850-880

**Current Code:**
```tsx
{profitByProperty.length > 0 && (
  <motion.div
    initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
    animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
    transition={{
      duration: durationToSeconds(motionTokens.duration.base),
      delay: 0.24,
      ease: motionTokens.ease.standard,
    }}
    layout={false}
    className="mb-8"
  >
    <div className="mb-4">
      <h2 className="text-2xl font-semibold text-foreground">Property Profitability</h2>
      <p className="text-sm text-muted-foreground">Net profit and margins by property</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {profitByProperty.map((item, index) => (
        <ProfitMarginCard
          key={item.property.id}
          propertyName={item.property.name}
          rentCollected={item.rentCollected}
          expenses={item.expenses}
          index={index}
        />
      ))}
    </div>
  </motion.div>
)}
```

**Fixed Code:**
```tsx
{profitByProperty.length > 0 && (
  <CollapsibleSection
    id="dashboard-property-profitability"
    title="Property Profitability"
    defaultExpanded={true}
    className="mb-8"
  >
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        delay: 0.24,
        ease: motionTokens.ease.standard,
      }}
      layout={false}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profitByProperty.map((item, index) => (
          <ProfitMarginCard
            key={item.property.id}
            propertyName={item.property.name}
            rentCollected={item.rentCollected}
            expenses={item.expenses}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  </CollapsibleSection>
)}
```

**Testing:**
1. Start dev server
2. Login as landlord with properties
3. Navigate to dashboard
4. Verify "Property Profitability" section has collapse icon
5. Click collapse icon - section should collapse
6. Refresh page - state should persist
7. Test on mobile viewport

---

### Fix 2: Tenant Join Household Flow
**Priority:** P0 - Critical User Flow  
**Effort:** 4-6 hours  
**Owner:** TBD

**Investigation Checklist:**

#### Step 1: Verify Route Exists (30 min)
```bash
# Search for accept-invite route
grep -r "accept-invite" src/router/
grep -r "AcceptInvite" src/pages/
```

**If route missing, create:**
```typescript
// src/pages/tenant/accept-invite.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  
  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('Missing invitation token')
      setStatus('error')
      return
    }
    
    acceptInvite(token)
  }, [searchParams])
  
  async function acceptInvite(token: string) {
    try {
      // 1. Fetch invite details
      const { data: invite, error: fetchError } = await supabase
        .from('tenant_invites')
        .select('*, properties(name), units(unit_number)')
        .eq('token', token)
        .single()
      
      if (fetchError) throw fetchError
      if (!invite) throw new Error('Invite not found')
      if (invite.status === 'accepted') throw new Error('Invite already used')
      if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired')
      
      // 2. Create or link lease
      const { error: leaseError } = await supabase
        .from('leases')
        .insert({
          property_id: invite.property_id,
          unit_id: invite.unit_id,
          tenant_id: (await supabase.auth.getUser()).data.user?.id,
          start_date: new Date().toISOString(),
          status: 'active'
        })
      
      if (leaseError) throw leaseError
      
      // 3. Mark invite as accepted
      await supabase
        .from('tenant_invites')
        .update({ status: 'accepted' })
        .eq('token', token)
      
      setStatus('success')
      setTimeout(() => navigate('/tenant/dashboard'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
      setStatus('error')
    }
  }
  
  if (status === 'loading') return <div>Accepting invitation...</div>
  if (status === 'error') return <div>Error: {error}</div>
  return <div>Success! Redirecting to your dashboard...</div>
}
```

**Add to router:**
```typescript
// src/router/index.tsx
{
  path: '/accept-invite',
  element: <AcceptInvitePage />
}
```

#### Step 2: Test Token Extraction (1 hour)
```typescript
// Create test file: tests/unit/token-extraction.spec.ts
import { describe, it, expect } from 'vitest'

function extractTokenFromUrl(url: string): string | null {
  // Copy logic from JoinHouseholdForm
  // Add all edge case tests
}

describe('Token Extraction', () => {
  it('extracts from full URL with query param', () => {
    expect(extractTokenFromUrl('https://uhome.app/accept-invite?token=abc-123'))
      .toBe('abc-123')
  })
  
  it('extracts from relative URL', () => {
    expect(extractTokenFromUrl('/accept-invite?token=abc-123'))
      .toBe('abc-123')
  })
  
  it('extracts from path-based URL', () => {
    expect(extractTokenFromUrl('accept-invite/abc-123'))
      .toBe('abc-123')
  })
  
  it('extracts bare token', () => {
    expect(extractTokenFromUrl('abc-123'))
      .toBe('abc-123')
  })
  
  it('handles URL with extra params', () => {
    expect(extractTokenFromUrl('/accept-invite?token=abc-123&foo=bar'))
      .toBe('abc-123')
  })
  
  it('returns null for invalid input', () => {
    expect(extractTokenFromUrl('invalid'))
      .toBe(null)
  })
})
```

#### Step 3: Create E2E Test (2 hours)
```typescript
// tests/e2e/tenant/invite-acceptance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Tenant Invite Acceptance Flow', () => {
  let inviteToken: string
  
  test.beforeEach(async ({ page }) => {
    // Login as landlord and create invite
    await page.goto('/login')
    await page.fill('[name="email"]', 'landlord@test.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await page.goto('/landlord/tenants')
    await page.click('text=Invite Tenant')
    await page.fill('[name="email"]', 'newtenant@test.com')
    await page.selectOption('[name="property"]', { index: 0 })
    await page.click('text=Send Invite')
    
    // Extract token from success message or clipboard
    const inviteLink = await page.locator('[data-testid="invite-link"]').textContent()
    inviteToken = new URL(inviteLink!).searchParams.get('token')!
  })
  
  test('accepts invite and creates lease', async ({ page }) => {
    // Logout landlord
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Sign Out')
    
    // Navigate to invite link
    await page.goto(`/accept-invite?token=${inviteToken}`)
    
    // Should show processing
    await expect(page.locator('text=Accepting invitation')).toBeVisible()
    
    // Should redirect to tenant dashboard
    await page.waitForURL('/tenant/dashboard')
    
    // Should show property info
    await expect(page.locator('[data-testid="property-info"]')).toBeVisible()
  })
  
  test('shows error for invalid token', async ({ page }) => {
    await page.goto('/accept-invite?token=invalid-token')
    await expect(page.locator('text=Invite not found')).toBeVisible()
  })
  
  test('shows error for expired invite', async ({ page }) => {
    // TODO: Create expired invite in DB
    await page.goto(`/accept-invite?token=${expiredToken}`)
    await expect(page.locator('text=Invite expired')).toBeVisible()
  })
})
```

#### Step 4: Verify Database Schema (30 min)
```sql
-- Check tenant_invites table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenant_invites';

-- Verify RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tenant_invites';
```

**Expected columns:**
- id (UUID, PK)
- landlord_id (UUID, FK)
- property_id (UUID, FK)
- unit_id (UUID, FK, nullable)
- email (TEXT)
- token (TEXT, unique)
- status (TEXT, default 'pending')
- expires_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)

---

### Fix 3: Notification Dropdown & Page
**Priority:** P1 - UX Polish  
**Effort:** 3-4 hours  
**Owner:** TBD

#### Part A: Fix Dropdown Positioning (1 hour)

**File:** `src/components/ui/notification-dropdown.tsx` or `src/components/layout/landlord-layout.tsx`

**Find the NotificationDropdown component and update CSS:**
```tsx
<div className="relative">
  <button
    onClick={() => setIsOpen(!isOpen)}
    className="relative p-2 rounded-lg hover:bg-accent"
  >
    <Bell className="h-5 w-5" />
    {unreadCount > 0 && (
      <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
        {unreadCount}
      </span>
    )}
  </button>
  
  {isOpen && (
    <div className="absolute top-full right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50">
      {/* Notification list */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Notifications</h3>
          <button onClick={markAllAsRead} className="text-sm text-muted-foreground hover:text-foreground">
            Mark all read
          </button>
        </div>
        
        {notifications.slice(0, 5).map(notification => (
          <div key={notification.id} className="...">
            {/* Notification item */}
          </div>
        ))}
        
        <Button
          variant="ghost"
          onClick={() => navigate(`/${role}/notifications`)} // FIXED
          className="w-full mt-2"
        >
          View All
        </Button>
      </div>
    </div>
  )}
</div>
```

**Key CSS changes:**
- `top-full` - Positions dropdown below button
- `mt-2` - 8px gap below trigger
- `right-0` - Aligns right edge with button
- `z-50` - Ensures dropdown appears above other content

#### Part B: Create Notifications Page (2-3 hours)

**Create files:**
1. `src/pages/landlord/notifications.tsx`
2. `src/pages/tenant/notifications.tsx`

```typescript
// src/pages/landlord/notifications.tsx
import { useState } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Bell, Check, Trash2, Search } from 'lucide-react'

export function LandlordNotifications() {
  const { notifications, loading, markAsRead, deleteNotification } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [search, setSearch] = useState('')
  
  const filteredNotifications = notifications
    .filter(n => filter === 'all' || !n.read)
    .filter(n => n.title.toLowerCase().includes(search.toLowerCase()))
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground">Stay updated on your properties and tenants</p>
      </div>
      
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread ({notifications.filter(n => !n.read).length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="space-y-2">
        {filteredNotifications.map(notification => (
          <div
            key={notification.id}
            className={cn(
              "p-4 rounded-lg border",
              !notification.read && "bg-accent/50"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium">{notification.title}</h3>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at))} ago
                </span>
              </div>
              <div className="flex gap-2">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => markAsRead(notification.id)}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteNotification(notification.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {filteredNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No notifications found</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Add to router:**
```typescript
// src/router/index.tsx
{
  path: '/landlord/notifications',
  element: <LandlordNotifications />
},
{
  path: '/tenant/notifications',
  element: <TenantNotifications />
}
```

---

### Fix 4: Admin Panel Integration Analysis
**Priority:** P1 - Depends on Launch Requirements  
**Effort:** 2 hours (analysis) + TBD (implementation)  
**Owner:** TBD

**Analysis Checklist:**

#### Step 1: Document Current Admin Features (1 hour)
```markdown
# Admin Panel Feature Inventory

## Implemented Features
- [ ] User listing with search
- [ ] Ban/unban users
- [ ] Lock/unlock accounts
- [ ] Reset passwords
- [ ] Delete users
- [ ] Audit log viewing
- [ ] Security event monitoring

## Missing/Incomplete Features
- [ ] Real-time dashboard metrics
- [ ] User impersonation (if needed)
- [ ] Bulk user actions
- [ ] Export audit logs
- [ ] Email notification templates
- [ ] System configuration
- [ ] Feature flag management
```

#### Step 2: Gap Analysis (30 min)
Compare implemented features vs. launch requirements:
- What's MVP critical?
- What's nice-to-have?
- What's post-launch?

#### Step 3: Create Implementation Tickets (30 min)
For each missing feature:
- Description
- Acceptance criteria
- Effort estimate
- Dependencies
- Priority

---

## Testing Checklist

### Manual Testing (2 hours)
- [ ] Property Profitability collapse/expand
- [ ] Tenant invite link generation
- [ ] Tenant invite acceptance (all URL formats)
- [ ] Notification dropdown positioning
- [ ] Notification "View All" routing
- [ ] Notifications page functionality
- [ ] Cross-browser (Chrome, Firefox, Safari)
- [ ] Mobile responsive

### Automated Testing (1 hour)
- [ ] Run full E2E suite: `npm run test:e2e:headless`
- [ ] Verify new tests pass
- [ ] Check test coverage didn't decrease
- [ ] Run visual regression tests

---

## Deployment Plan

### Staging Deployment
1. Merge fixes to `develop` branch
2. Deploy to staging environment
3. Run smoke tests
4. QA approval

### Production Deployment
1. Merge to `main` branch
2. Create release tag (e.g., `v0.2.0`)
3. Deploy to production
4. Monitor error logs for 1 hour
5. Verify all fixes in production

---

## Success Criteria

✅ Property Profitability section is collapsible  
✅ Tenant can accept invite via any URL format  
✅ Notification dropdown appears below bell icon  
✅ "View All" navigates to `/notifications` page  
✅ Notifications page shows filterable list  
✅ All E2E tests pass (>95% pass rate)  
✅ No new bugs introduced

---

**Estimated Total Effort:** 10-14 hours  
**Timeline:** Complete by end of week (March 28, 2025)  
**Next Review:** Monday, March 25, 2025
