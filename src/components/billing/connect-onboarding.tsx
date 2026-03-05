import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createConnectOnboardingLink, getConnectAccountStatus } from '@/lib/stripe/connect'
import { isFeatureEnabled } from '@/lib/feature-flags'

interface ConnectOnboardingProps {
  propertyId: string
  onComplete?: () => void
}

export function ConnectOnboarding({ propertyId, onComplete: _onComplete }: ConnectOnboardingProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accountStatus, setAccountStatus] = useState<{
    accountId: string | null
    onboardingStatus: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAccountStatus()
  }, [propertyId])

  async function checkAccountStatus() {
    setChecking(true)
    setError(null)

    const result = await getConnectAccountStatus(propertyId)
    if ('error' in result) {
      setError(result.error.message)
      setChecking(false)
      return
    }

    setAccountStatus(result)
    setChecking(false)
  }

  async function handleStartOnboarding() {
    if (!isFeatureEnabled('ENABLE_STRIPE_CONNECT')) {
      setError('Stripe Connect is not enabled')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const returnUrl = `${window.location.origin}/landlord/properties/${propertyId}?stripe_return=true`
      const result = await createConnectOnboardingLink(propertyId, returnUrl)

      if ('error' in result) {
        setError(result.error.message)
        return
      }

      // Redirect to Stripe onboarding
      window.location.href = result.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start onboarding')
    } finally {
      setLoading(false)
    }
  }

  if (!isFeatureEnabled('ENABLE_STRIPE_CONNECT')) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Enable Rent Collection</CardTitle>
          <CardDescription>
            Connect your Stripe account to accept rent payments online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Stripe Connect is not enabled. Enable it in your environment variables to use rent
              collection.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (checking) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Enable Rent Collection</CardTitle>
          <CardDescription>
            Connect your Stripe account to accept rent payments online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isComplete = accountStatus?.onboardingStatus === 'complete'
  const isInProgress = accountStatus?.onboardingStatus === 'in_progress'
  const isFailed = accountStatus?.onboardingStatus === 'failed'

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Enable Rent Collection</CardTitle>
        <CardDescription>
          Connect your Stripe account to accept rent payments online. Tenants can pay rent directly
          through the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isComplete && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your Stripe account is connected and ready to accept payments.
            </AlertDescription>
          </Alert>
        )}

        {isInProgress && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Your Stripe account onboarding is in progress. Complete the setup in Stripe to enable
              rent collection.
            </AlertDescription>
          </Alert>
        )}

        {isFailed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Stripe account onboarding failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            By connecting your Stripe account, you'll be able to:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Accept rent payments online from tenants</li>
            <li>Automatically track payment status</li>
            <li>Receive funds directly to your bank account</li>
            <li>Generate receipts automatically</li>
          </ul>
        </div>

        {!isComplete && (
          <Button
            onClick={handleStartOnboarding}
            disabled={loading || isInProgress}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : isInProgress ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Onboarding in Progress
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Connect Stripe Account
              </>
            )}
          </Button>
        )}

        {isComplete && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">
              Your account is connected. You can manage your Stripe account settings in the Stripe
              Dashboard.
            </p>
            <Button variant="outline" onClick={checkAccountStatus} className="w-full">
              Refresh Status
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
