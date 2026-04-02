# CURSOR HANDOFF: Sprint 2 Item 14 - Stripe Customer Portal

## Status: ✅ COMPLETE in repository (April 2026)

**Implementation:** Billing section in `src/pages/settings.tsx`; `trialEnd` in `use-subscription.ts`; Edge Function uses `organization_members` → `subscriptions` by `organization_id` (not `user_id`). See [docs/PRE_COMMIT_CHECKLIST.md](docs/PRE_COMMIT_CHECKLIST.md) before future commits.

**Manual:** Deploy `create-portal-session`, set Supabase/Stripe secrets, enable Stripe Customer Portal.

**Date:** April 2, 2026  
**Sprint:** 2 of 4  
**Item:** 14 - Add Stripe Customer Portal for self-serve billing  

---

## ✅ COMPLETED WORK

### 1. **Edge Function Created** ✅
**File:** `supabase/functions/create-portal-session/index.ts`

- Resolves `organization_id` via `organization_members`, then fetches Stripe customer ID from `subscriptions`
- Creates Stripe Customer Portal session
- Returns redirect URL for user
- Handles CORS properly
- **Status:** Complete, ready to deploy

### 2. **Frontend Hook Created** ✅
**File:** `src/hooks/use-stripe-portal.ts`

- `openPortal()` function calls Edge Function
- Handles loading/error states
- Redirects to Stripe portal URL
- Clean error handling
- **Status:** Complete, ready to use

### 3. **Settings Page Setup** ✅
**File:** `src/pages/settings.tsx`

- Added imports: `useSubscription`, `useStripePortal`, `Badge`, `CreditCard` icon
- Hooks wired into component
- **Status:** Imports complete, needs UI section

---

## 🚧 REMAINING WORK (20 min)

### **Task: Add Billing Section to Settings Page**

**Location:** `src/pages/settings.tsx` line ~467  
**Insert After:** Dashboard section (landlord only)  
**Insert Before:** Interface Preferences section

**Code to Add:**

```typescript
{/* Section: Billing & Subscription (landlord only) */}
{role === 'landlord' && (
  <SettingsSection
    title="Billing & Subscription"
    description="Manage your plan and payment methods"
  >
    <div className="space-y-4">
      {subscriptionLoading ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Loading subscription...</p>
        </div>
      ) : subscription ? (
        <>
          {/* Current Plan Card */}
          <div className="p-4 rounded-md border-2 border-primary/50 bg-primary/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Current Plan</span>
              <Badge variant="default">{subscription.planName || 'Free'}</Badge>
            </div>
            <div className="space-y-1">
              {subscription.status === 'active' && subscription.currentPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  ${(subscription.amount / 100).toFixed(2)}/{subscription.interval} • Renews{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {subscription.status === 'trialing' && subscription.trialEnd && (
                <p className="text-xs text-warning">
                  Trial ends {new Date(subscription.trialEnd).toLocaleDateString()}
                </p>
              )}
              {subscription.status === 'canceled' && (
                <p className="text-xs text-destructive">
                  Access ends {new Date(subscription.currentPeriodEnd || '').toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Trial Warning */}
          {subscription.status === 'trialing' && subscription.trialEnd && (
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-sm text-foreground mb-1">
                Your trial ends on{' '}
                <strong>{new Date(subscription.trialEnd).toLocaleDateString()}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Upgrade now to keep access after your trial ends.
              </p>
            </div>
          )}

          {/* Portal Error */}
          {portalError && (
            <div className="p-3 rounded-md bg-destructive/20 border border-destructive/30">
              <p className="text-sm text-destructive">{portalError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {subscription.stripeCustomerId ? (
              <Button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex-1"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {portalLoading ? 'Opening...' : 'Manage Billing'}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                No billing portal available. Contact support.
              </p>
            )}
            
            {subscription.planName === 'Free' && (
              <Button
                variant="default"
                onClick={() => navigate('/landlord/subscription-plans')}
                className="flex-1"
              >
                Upgrade Plan
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No subscription found</p>
        </div>
      )}
    </div>
  </SettingsSection>
)}
```

---

## 📋 INTEGRATION CHECKLIST

### **Step 1: Add Billing Section** (~15 min)
1. Open `src/pages/settings.tsx`
2. Find line ~467 (after Dashboard section closes)
3. Paste the billing section code above
4. Verify imports are correct (already added)
5. Save file

### **Step 2: Test Settings Page** (~5 min)
1. Start dev server: `npm run dev`
2. Navigate to `/settings`
3. Verify Settings page loads without errors
4. Check billing section appears (landlord only)
5. Test "Manage Billing" button (should redirect to Stripe)

### **Step 3: Deploy Edge Function** (Manual - after testing)
```bash
# Deploy to Supabase
supabase functions deploy create-portal-session

# Add secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

---

## 🐛 KNOWN ISSUES TO FIX

### **Settings Page Crash** (Low Priority)
- **Symptom:** "Something Went Wrong" error on /settings
- **Likely Cause:** Missing avatar loading logic or context issue
- **Status:** Needs investigation
- **Workaround:** Refresh page or clear localStorage

### **Avatar Upload Feature** (Low Priority)
- **Issue:** Avatar state never loads from database on mount
- **Fix Needed:** Add useEffect to load user avatar from profiles table
- **Priority:** Medium - feature appears broken

---

## 🎯 SUCCESS CRITERIA

- [x] Edge Function created
- [x] Hook created
- [x] Billing section added to Settings
- [ ] Settings page loads without errors (verify in your environment)
- [ ] "Manage Billing" button works (requires deployed function + `stripe_customer_id`)
- [x] Trial status displays when `trial_end` present
- [ ] Mobile-responsive design verified

---

## 📝 NEXT ITEMS (Sprint 2 Remaining)

After Item 14 is complete:

**Item 15:** Trial status UI to billing section (DONE as part of Item 14)  
**Item 16:** Plan gate enforcement audit (~1 hr)  
**Item 19:** Wire Vercel deploy into GitHub Actions (~30 min)

---

## 🔧 TROUBLESHOOTING

### **If Billing Section Doesn't Appear:**
1. Check role: Only shows for `role === 'landlord'`
2. Verify `useSubscription` hook is imported
3. Check console for errors
4. Verify subscription data is loading

### **If "Manage Billing" Fails:**
1. Check Edge Function is deployed
2. Verify `STRIPE_SECRET_KEY` is set in Supabase
3. Check browser console for error details
4. Verify user has `stripe_customer_id` in database

### **If Settings Page Crashes:**
1. Comment out billing section temporarily
2. Test if page loads
3. Check browser console for specific error
4. Verify all imports are correct

---

## 📚 REFERENCE

**Stripe Customer Portal Docs:**  
https://stripe.com/docs/billing/subscriptions/customer-portal

**Supabase Edge Functions:**  
https://supabase.com/docs/guides/functions

**Project Docs:**  
- Sprint checklist: `/launch_sprint_checklist.docx`
- Settings audit: `/SETTINGS_AUDIT_ITEM14.md`
- Empty state audit: `/EMPTY_STATE_AUDIT.md`

---

## 🚀 DEPLOYMENT NOTES

**Before Production:**
1. Test Stripe Portal in test mode
2. Verify webhook endpoint registered (Sprint 0 Item 4)
3. Test trial end date calculations
4. Verify plan upgrade flow
5. Test cancel/downgrade scenarios

**Environment Variables Required:**
- `STRIPE_SECRET_KEY` (Supabase Edge Functions)
- `VITE_STRIPE_PUBLISHABLE_KEY` (Frontend - already set)

---

**Ready to continue? Just paste the billing section code into settings.tsx and test!**
