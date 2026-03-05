import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { RentPayment } from '@/components/billing/rent-payment'
import { useRentRecords } from '@/hooks/use-rent-records'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useLeases } from '@/hooks/use-leases'
import { ArrowLeft, DollarSign, AlertCircle } from 'lucide-react'
import { isFeatureEnabled } from '@/lib/feature-flags'

/**
 * Tenant Pay Rent Page
 *
 * Allows tenants to pay rent online via Stripe Connect.
 * Shows payment form for a specific rent record.
 */
export function TenantPayRent() {
  const { recordId } = useParams<{ recordId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: tenantData } = useTenantData()
  const { leases } = useLeases(undefined, tenantData?.tenant.id)
  const activeLease = leases?.find(
    l => !l.lease_end_date || new Date(l.lease_end_date) > new Date()
  )
  const { records: rentRecords } = useRentRecords(activeLease?.id)

  // Check if payment was successful (from redirect)
  const paymentSuccess = searchParams.get('payment_success') === 'true'

  // Find the rent record
  const rentRecord = recordId ? rentRecords.find(r => r.id === recordId) : null

  if (!isFeatureEnabled('ENABLE_STRIPE_CONNECT')) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <Button variant="ghost" onClick={() => navigate('/tenant/finances')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Finances
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Online rent payment is not available. Please contact your landlord for payment
              instructions.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen max-w-2xl">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <Button variant="ghost" onClick={() => navigate('/tenant/finances')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Finances
          </Button>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Payment Successful</CardTitle>
              <CardDescription>Your rent payment has been processed</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Your payment has been successfully processed. You will receive a receipt via
                  email, and your payment history will be updated shortly.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/tenant/finances')} className="mt-4 w-full">
                View Payment History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!recordId) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <Button variant="ghost" onClick={() => navigate('/tenant/finances')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Finances
          </Button>
          <EmptyState
            icon={<DollarSign className="h-8 w-8" />}
            title="No rent record selected"
            description="Please select a rent record to pay from your payment history."
            action={{
              label: 'View Payment History',
              onClick: () => navigate('/tenant/finances'),
            }}
          />
        </div>
      </div>
    )
  }

  if (!rentRecord) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <Button variant="ghost" onClick={() => navigate('/tenant/finances')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Finances
          </Button>
          <EmptyState
            icon={<DollarSign className="h-8 w-8" />}
            title="Rent record not found"
            description="The rent record you're trying to pay doesn't exist or you don't have access to it."
            action={{
              label: 'View Payment History',
              onClick: () => navigate('/tenant/finances'),
            }}
          />
        </div>
      </div>
    )
  }

  // Only allow payment for pending or overdue records
  if (rentRecord.status === 'paid') {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen max-w-2xl">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <Button variant="ghost" onClick={() => navigate('/tenant/finances')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Finances
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This rent record has already been paid. No payment is required.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const totalAmount = Number(rentRecord.amount) + (rentRecord.late_fee || 0)

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen max-w-2xl">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <Button variant="ghost" onClick={() => navigate('/tenant/finances')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Finances
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">Pay Rent</h1>
          <p className="text-muted-foreground mt-1">
            Due: {new Date(rentRecord.due_date).toLocaleDateString()}
          </p>
        </div>

        <RentPayment
          rentRecordId={rentRecord.id}
          amount={totalAmount}
          onSuccess={() => {
            navigate('/tenant/finances?payment_success=true')
          }}
          onCancel={() => {
            navigate('/tenant/finances')
          }}
        />
      </div>
    </div>
  )
}
