# CURSOR: Continue Sprint 2 Item 14

**Task:** Add Billing & Subscription section to Settings page  
**Time:** 20 minutes  
**Status:** 80% complete — just needs UI integration

---

## Quick Context

**What's Done:**
- ✅ Edge Function: `supabase/functions/create-portal-session/index.ts`
- ✅ Hook: `src/hooks/use-stripe-portal.ts`
- ✅ Imports added to `src/pages/settings.tsx`

**What's Needed:**
- Add billing section UI to Settings page (line ~467)

---

## Paste This Code

**Location:** `src/pages/settings.tsx` line ~467  
**After:** Dashboard section (`</SettingsSection>` + `)}`)  
**Before:** Interface Preferences section

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

## Test

```bash
npm run dev
# Navigate to /settings
# Verify billing section appears
# Test "Manage Billing" button
```

---

## Deploy Edge Function (After Testing)

```bash
supabase functions deploy create-portal-session
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

---

## Success Criteria

- [ ] Settings page loads without errors
- [ ] Billing section shows for landlords
- [ ] "Manage Billing" redirects to Stripe
- [ ] Trial status displays correctly
- [ ] Mobile-responsive

---

**Full context:** `CURSOR_HANDOFF_ITEM14.md`  
**Sprint checklist:** `docs/LAUNCH_SPRINT_CHECKLIST.md`
