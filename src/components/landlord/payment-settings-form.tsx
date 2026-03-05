import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePaymentSettings } from '@/hooks/use-payment-settings'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { isFeatureEnabled } from '@/lib/feature-flags'

interface PaymentSettingsFormProps {
  propertyId: string
}

export function PaymentSettingsForm({ propertyId }: PaymentSettingsFormProps) {
  const { settings, loading, error, updateSettings } = usePaymentSettings(propertyId)
  const [refundsEnabled, setRefundsEnabled] = useState(true)
  const [gracePeriodDays, setGracePeriodDays] = useState(5)
  const [autoWithdrawEnabled, setAutoWithdrawEnabled] = useState(false)
  const [withdrawSchedule, setWithdrawSchedule] = useState<
    'daily' | 'weekly' | 'monthly' | 'manual'
  >('manual')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Check if Stripe Connect is enabled
  const stripeEnabled = isFeatureEnabled('ENABLE_STRIPE_CONNECT')

  // Initialize form with settings
  useEffect(() => {
    if (settings) {
      setRefundsEnabled(settings.refunds_enabled)
      setGracePeriodDays(settings.grace_period_days)
      setAutoWithdrawEnabled(settings.auto_withdraw_enabled)
      setWithdrawSchedule(settings.withdraw_schedule)
    }
  }, [settings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)

    try {
      const { error: updateError } = await updateSettings({
        refunds_enabled: refundsEnabled,
        grace_period_days: gracePeriodDays,
        auto_withdraw_enabled: autoWithdrawEnabled,
        withdraw_schedule: withdrawSchedule,
      })

      if (updateError) throw updateError

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving payment settings:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!stripeEnabled) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
          <CardDescription>Configure payment processing settings for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Stripe Connect is not enabled. Enable it in your environment variables to use payment
              settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
          <CardDescription>Configure payment processing settings for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
          <CardDescription>Configure payment processing settings for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Error loading payment settings: {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Payment Settings</CardTitle>
        <CardDescription>
          Configure payment processing settings for this property. These settings apply to all rent
          payments processed through Stripe Connect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Refunds */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="refunds-enabled">Enable Refunds</Label>
              <p className="text-sm text-muted-foreground">
                Allow refunds to be processed for rent payments on this property
              </p>
            </div>
            <Switch
              id="refunds-enabled"
              checked={refundsEnabled}
              onCheckedChange={setRefundsEnabled}
            />
          </div>

          {/* Grace Period */}
          <div className="space-y-2">
            <Label htmlFor="grace-period">Grace Period (Days)</Label>
            <p className="text-sm text-muted-foreground">
              Number of days after the due date before a payment is considered late
            </p>
            <Input
              id="grace-period"
              type="number"
              min="0"
              max="31"
              value={gracePeriodDays}
              onChange={e => setGracePeriodDays(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Auto Withdraw */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-withdraw">Automatic Withdrawals</Label>
              <p className="text-sm text-muted-foreground">
                Automatically transfer funds to your bank account on a schedule
              </p>
            </div>
            <Switch
              id="auto-withdraw"
              checked={autoWithdrawEnabled}
              onCheckedChange={setAutoWithdrawEnabled}
            />
          </div>

          {/* Withdraw Schedule */}
          {autoWithdrawEnabled && (
            <div className="space-y-2">
              <Label htmlFor="withdraw-schedule">Withdrawal Schedule</Label>
              <p className="text-sm text-muted-foreground">
                How often to automatically transfer funds to your bank account
              </p>
              <select
                id="withdraw-schedule"
                value={withdrawSchedule}
                onChange={e => setWithdrawSchedule(e.target.value as typeof withdrawSchedule)}
                className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="manual">Manual (on-demand only)</option>
              </select>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Settings saved successfully
              </div>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
