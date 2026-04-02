# Settings Page Audit + Item 14 Implementation Plan

## Date: April 2, 2026
## Sprint 2, Item 14: Stripe Customer Portal Integration

---

## **CRITICAL FINDINGS from Settings Page:**

### **1. ❌ Settings Page Crash** (BLOCKER)
- **Issue:** Page shows "Something Went Wrong" error
- **Location:** `src/pages/settings.tsx`
- **Likely Cause:** Missing context dependency or undefined variable
- **Priority:** HIGH — Must fix before adding billing section
- **Action:** Debug error boundary, check console logs

### **2. ⚠️ Avatar Upload Feature** (Incomplete)
- **Code:** `useImageUpload` hook exists, `avatarUrl` state defined
- **Issue:** Avatar state never loads from database
- **Missing:** Load user avatar from profiles table on mount
- **Priority:** MEDIUM — Feature looks broken to users

### **3. ⚠️ Organization Name Field** (No Backend)
- **Code:** `organizationName` field in Settings
- **Issue:** Not saved anywhere in database
- **Missing:** Column in profiles/users table + mutation
- **Priority:** MEDIUM — Data not persisted

### **4. ❌ organizationId Still Hardcoded** (Sprint 0 Item 1 INCOMPLETE)
- **Location:** `src/contexts/auth-context.tsx:43, 67`
- **Code:** `organizationId: null` hardcoded
- **Impact:** Billing system broken (can't query subscriptions)
- **Priority:** CRITICAL — Blocks entire billing feature
- **Action:** Wire organizationId from organization_members table

---

## **Implementation Plan: Item 14 + Fixes**

### **Phase 1: Fix Blockers** (~30 min)
1. ✅ Debug Settings page crash
2. ✅ Wire organizationId into AuthContext (Sprint 0 Item 1)
3. ✅ Test Settings page loads correctly

### **Phase 2: Build Billing Section** (~45 min)
1. ✅ Create Edge Function: `supabase/functions/create-portal-session/index.ts`
2. ✅ Add "Billing & Subscription" section to Settings page
3. ✅ Display current plan + status
4. ✅ Add trial status UI (if trialing)
5. ✅ "Manage Billing" button → Stripe Portal
6. ✅ "Upgrade Plan" button (for Free users)

### **Phase 3: Mobile-Ready Design** (~15 min)
- Use existing `SettingsSection` component (already responsive)
- Stack elements vertically on mobile
- Ensure Stripe Portal works on mobile browsers

---

## **Billing Section Design (Mobile-First)**

```typescript
<SettingsSection
  title="Billing & Subscription"
  description="Manage your plan and payment methods"
>
  {/* Current Plan Card */}
  <div className="p-4 rounded-md border-2 border-primary/50 bg-primary/10">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-semibold">Current Plan</span>
      <Badge variant="default">Landlord</Badge>
    </div>
    <p className="text-xs text-muted-foreground">
      $29.99/month • Renews April 15, 2026
    </p>
  </div>

  {/* Trial Warning (if applicable) */}
  {status === 'trialing' && (
    <div className="p-3 rounded-md bg-muted/50 border border-border">
      <p className="text-sm text-foreground">
        Your trial ends on <strong>April 10, 2026</strong>
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Upgrade now to keep access after trial ends.
      </p>
    </div>
  )}

  {/* Action Buttons */}
  <div className="flex gap-2">
    <Button onClick={handleManageBilling} className="flex-1">
      Manage Billing
    </Button>
    {plan === 'free' && (
      <Button variant="default" onClick={handleUpgrade} className="flex-1">
        Upgrade Plan
      </Button>
    )}
  </div>
</SettingsSection>
```

---

## **Next Actions:**

1. **Fix Settings crash** — investigate error
2. **Wire organizationId** — complete Sprint 0 Item 1
3. **Create portal Edge Function**
4. **Add Billing section** — mobile-responsive design
5. **Test end-to-end** — verify Stripe portal works

---

**Total Time:** ~1.5 hours
**Priority:** HIGH (blocks subscription system)
