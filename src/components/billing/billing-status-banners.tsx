import type { SubscriptionStatus } from '@/lib/stripe/plans'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function formatSubscriptionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' })
}

function trialEndsWithinSevenDays(trialEnd: string): boolean {
  return new Date(trialEnd).getTime() - Date.now() < SEVEN_DAYS_MS
}

export interface BillingStatusBannersProps {
  subscriptionStatus: SubscriptionStatus | null
  trialEnd: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  onUpgrade: () => void
  onPortal: () => void
  portalLoading: boolean
}

export function BillingStatusBanners({
  subscriptionStatus,
  trialEnd,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  stripeCustomerId,
  onUpgrade,
  onPortal,
  portalLoading,
}: BillingStatusBannersProps) {
  const showPastDue = subscriptionStatus === 'past_due'
  const showCancel = cancelAtPeriodEnd && Boolean(currentPeriodEnd)
  const showTrial = subscriptionStatus === 'trialing' && Boolean(trialEnd)

  if (!showPastDue && !showCancel && !showTrial) {
    return null
  }

  const portalUnavailable = !stripeCustomerId

  return (
    <div className="space-y-3">
      {showPastDue && (
        <div
          className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          data-testid="billing-banner-past-due"
        >
          <p className="text-sm text-destructive">
            Payment failed. Update your payment method to avoid losing access.
          </p>
          <div className="flex shrink-0 flex-col gap-1 sm:items-end">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={portalLoading || portalUnavailable}
              onClick={() => void onPortal()}
            >
              {portalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Update Payment
            </Button>
            {portalUnavailable && (
              <p className="text-xs text-muted-foreground">
                Billing portal is unavailable. Contact support to update payment details.
              </p>
            )}
          </div>
        </div>
      )}

      {showCancel && currentPeriodEnd && (
        <div
          className="flex flex-col gap-3 rounded-md border border-border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
          data-testid="billing-banner-cancel"
        >
          <p className="text-sm text-foreground">
            Your subscription will cancel on {formatSubscriptionDate(currentPeriodEnd)}.
            Reactivate to keep access.
          </p>
          <div className="flex shrink-0 flex-col gap-1 sm:items-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={portalLoading || portalUnavailable}
              onClick={() => void onPortal()}
            >
              {portalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Manage Billing
            </Button>
            {portalUnavailable && (
              <p className="text-xs text-muted-foreground">
                Billing portal is unavailable. Contact support to update payment details.
              </p>
            )}
          </div>
        </div>
      )}

      {showTrial && trialEnd && (
        <div
          className={`flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between ${
            trialEndsWithinSevenDays(trialEnd)
              ? 'border-amber-500/50 bg-amber-500/10 dark:border-amber-500/40 dark:bg-amber-500/10'
              : 'border-border bg-muted/50'
          }`}
          data-testid="billing-banner-trial"
        >
          <p
            className={`text-sm ${
              trialEndsWithinSevenDays(trialEnd)
                ? 'text-amber-900 dark:text-amber-100'
                : 'text-foreground'
            }`}
          >
            Your free trial ends on {formatSubscriptionDate(trialEnd)}. Upgrade now to keep access
            to all features.
          </p>
          <Button type="button" size="sm" className="shrink-0" onClick={onUpgrade}>
            Upgrade
          </Button>
        </div>
      )}
    </div>
  )
}
