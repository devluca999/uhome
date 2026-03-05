import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Download, FileArchive, Clock } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'

type ExportRequest = {
  id: string
  requested_at: string
  generated_at: string | null
  download_url: string | null
  expires_at: string | null
  status: 'pending' | 'generating' | 'ready' | 'expired' | 'downloaded'
}

export function DataExport() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<ExportRequest[]>([])
  const [_loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  const enabled =
    isFeatureEnabled('ENABLE_GDPR_COMPLIANCE') || isFeatureEnabled('ENABLE_CCPA_COMPLIANCE')

  useEffect(() => {
    if (enabled && user) {
      fetchRequests()
    }
  }, [enabled, user])

  async function fetchRequests() {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching export requests:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestExport() {
    if (!user) return

    try {
      setRequesting(true)
      const { error } = await supabase.from('data_export_requests').insert({
        user_id: user.id,
        status: 'pending',
      })

      if (error) throw error

      // Log compliance event
      await supabase.from('compliance_audit_log').insert({
        action: 'data_export_request',
        user_id: user.id,
        metadata: {},
      })

      await fetchRequests()
    } catch (error) {
      console.error('Error requesting export:', error)
      alert('Failed to request data export. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  if (!enabled) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-2xl">
        <EmptyState
          icon={<Download className="h-12 w-12" />}
          title="Data export not available"
          description="This feature is not currently enabled."
        />
      </div>
    )
  }

  const readyRequest = requests.find(r => r.status === 'ready' && r.download_url)

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Export My Data</h1>
        <p className="text-muted-foreground mt-1">
          Download a copy of all your personal data (GDPR/CCPA)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>
            Request a complete export of all your personal data stored in our system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Your data export will include:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li>Profile information</li>
            <li>Properties and leases</li>
            <li>Messages and communications</li>
            <li>Documents and files</li>
            <li>Payment and financial records</li>
            <li>All other associated data</li>
          </ul>

          {readyRequest && (
            <Card className="border-primary mt-4">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileArchive className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Export Ready</span>
                      <Badge variant="default">Ready</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Generated{' '}
                      {readyRequest.generated_at &&
                        new Date(readyRequest.generated_at).toLocaleString()}
                    </p>
                    {readyRequest.expires_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires {new Date(readyRequest.expires_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      if (readyRequest.download_url) {
                        window.open(readyRequest.download_url, '_blank')
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleRequestExport}
            disabled={requesting || !!readyRequest}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            {requesting ? 'Requesting...' : 'Request Data Export'}
          </Button>
        </CardContent>
      </Card>

      {/* Previous Requests */}
      {requests.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Previous Requests</CardTitle>
            <CardDescription>Your data export request history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(request.requested_at).toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
