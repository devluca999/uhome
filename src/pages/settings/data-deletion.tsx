import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Trash2, AlertTriangle } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export function DataDeletion() {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const enabled = isFeatureEnabled('ENABLE_GDPR_COMPLIANCE') || isFeatureEnabled('ENABLE_CCPA_COMPLIANCE')

  async function handleSubmit() {
    if (!user) return

    if (!reason.trim()) {
      alert('Please provide a reason for your deletion request.')
      return
    }

    const confirmed = confirm(
      'Are you sure you want to request data deletion? This action cannot be undone once approved. Your account and all associated data will be permanently deleted after a 30-day retention period.'
    )

    if (!confirmed) return

    try {
      setSubmitting(true)
      const { error } = await supabase.from('data_deletion_requests').insert({
        user_id: user.id,
        reason: reason.trim(),
        status: 'pending',
      })

      if (error) throw error

      // Log compliance event
      await supabase.from('compliance_audit_log').insert({
        action: 'data_deletion_request',
        user_id: user.id,
        metadata: {
          reason: reason.trim(),
        },
      })

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting deletion request:', error)
      alert('Failed to submit deletion request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!enabled) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-2xl">
        <EmptyState
          icon={<Trash2 className="h-12 w-12" />}
          title="Data deletion not available"
          description="This feature is not currently enabled."
        />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Deletion Request Submitted</CardTitle>
            <CardDescription>
              Your data deletion request has been submitted and is pending admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You will be notified once your request has been reviewed. If approved, your account
              and all associated data will be permanently deleted after a 30-day retention period.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Request Data Deletion</h1>
        <p className="text-muted-foreground mt-1">
          Exercise your right to have your personal data deleted (GDPR/CCPA)
        </p>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle>Important Information</CardTitle>
          </div>
          <CardDescription>
            Please read the following before submitting your deletion request:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Your deletion request will be reviewed by an administrator before processing.
            </li>
            <li>
              Once approved, your account and all associated data will be permanently deleted.
            </li>
            <li>
              Deleted data will be retained for 30 days for recovery purposes, then permanently
              removed.
            </li>
            <li>This action cannot be undone once the retention period expires.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Deletion Request</CardTitle>
          <CardDescription>
            Please provide a reason for your deletion request (required)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Why are you requesting data deletion?"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Deletion Request'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
