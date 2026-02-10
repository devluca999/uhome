import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Mail, Plus, Send } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { NewsletterCampaignForm } from '@/components/admin/newsletter-campaign-form'
import { sendNewsletterCampaign } from '@/lib/newsletter/newsletter-service'

type NewsletterCampaign = {
  id: string
  subject: string
  content: string
  topic: string | null
  style_preset: string | null
  sent_at: string | null
  recipients_count: number
  opened_count: number
  clicked_count: number
  created_at: string
}

export function AdminNewsletter() {
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<NewsletterCampaign | null>(null)
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null)

  const enabled = isFeatureEnabled('ENABLE_ADMIN_NEWSLETTER')

  useEffect(() => {
    if (enabled) {
      fetchCampaigns()
    }
  }, [enabled])

  async function fetchCampaigns() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendCampaign(campaignId: string) {
    if (
      !confirm(
        'Are you sure you want to send this campaign to all subscribers? This action cannot be undone.'
      )
    ) {
      return
    }

    setSendingCampaignId(campaignId)
    try {
      const result = await sendNewsletterCampaign({
        campaignId,
        trackOpens: true,
        trackClicks: true,
      })

      if (result.success) {
        alert(
          `Campaign sent successfully!\nSent: ${result.sent}\nFailed: ${result.failed}${
            result.errors.length > 0 ? `\n\nErrors:\n${result.errors.slice(0, 5).join('\n')}` : ''
          }`
        )
        await fetchCampaigns()
      } else {
        alert(
          `Failed to send campaign.\nSent: ${result.sent}\nFailed: ${result.failed}\n\nErrors:\n${result.errors.slice(0, 5).join('\n')}`
        )
      }
    } catch (error) {
      console.error('Error sending campaign:', error)
      alert('Failed to send campaign. Please try again.')
    } finally {
      setSendingCampaignId(null)
    }
  }

  function handleCreateClick() {
    setEditingCampaign(null)
    setShowForm(true)
  }

  function handleEditClick(campaign: NewsletterCampaign) {
    setEditingCampaign(campaign)
    setShowForm(true)
  }

  function handleFormSuccess() {
    fetchCampaigns()
    setShowForm(false)
    setEditingCampaign(null)
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            icon={<Mail className="h-12 w-12" />}
            title="Newsletter feature disabled"
            description="Enable ENABLE_ADMIN_NEWSLETTER feature flag to use this feature."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Newsletter</h1>
            <p className="text-muted-foreground mt-1">Create and send newsletter campaigns</p>
          </div>
          <Button onClick={handleCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>Campaigns ({campaigns.length})</CardTitle>
            <CardDescription>All newsletter campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : campaigns.length === 0 ? (
              <EmptyState
                icon={<Mail className="h-8 w-8" />}
                title="No campaigns"
                description="Create your first newsletter campaign to get started."
              />
            ) : (
              <div className="space-y-2">
                {campaigns.map(campaign => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{campaign.subject}</span>
                        {campaign.topic && (
                          <span className="text-xs text-muted-foreground">({campaign.topic})</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {campaign.sent_at
                          ? `Sent ${new Date(campaign.sent_at).toLocaleDateString()}`
                          : 'Draft'}
                      </p>
                      {campaign.sent_at && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {campaign.recipients_count} recipients • {campaign.opened_count} opened •{' '}
                            {campaign.clicked_count} clicked
                          </p>
                          {campaign.recipients_count > 0 && (
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>
                                Open rate:{' '}
                                <span className="font-medium text-foreground">
                                  {((campaign.opened_count / campaign.recipients_count) * 100).toFixed(1)}%
                                </span>
                              </span>
                              <span>
                                Click rate:{' '}
                                <span className="font-medium text-foreground">
                                  {((campaign.clicked_count / campaign.recipients_count) * 100).toFixed(1)}%
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!campaign.sent_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendCampaign(campaign.id)}
                          disabled={sendingCampaignId === campaign.id}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {sendingCampaignId === campaign.id ? 'Sending...' : 'Send'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(campaign)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Form Modal */}
      <NewsletterCampaignForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingCampaign(null)
        }}
        campaign={editingCampaign}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
