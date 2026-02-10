import { useState, useEffect } from 'react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'
import { useReducedMotion, createSpring, motionTokens, durationToSeconds } from '@/lib/motion'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { ReflectiveGradient } from '@/components/ui/reflective-gradient'
import { cn } from '@/lib/utils'

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

interface NewsletterCampaignFormProps {
  isOpen: boolean
  onClose: () => void
  campaign?: NewsletterCampaign | null
  onSuccess: () => void
}

const TOPICS = [
  'Product Updates',
  'Tips & Best Practices',
  'Feature Announcements',
  'Community News',
  'Educational Content',
  'General',
]

const STYLE_PRESETS = ['Newsletter', 'Announcement', 'Update', 'Educational']

export function NewsletterCampaignForm({
  isOpen,
  onClose,
  campaign,
  onSuccess,
}: NewsletterCampaignFormProps) {
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState<string>('')
  const [stylePreset, setStylePreset] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()
  useModalScrollLock(isOpen)

  useEffect(() => {
    if (isOpen && campaign) {
      setSubject(campaign.subject || '')
      setContent(campaign.content || '')
      setTopic(campaign.topic || '')
      setStylePreset(campaign.style_preset || '')
    } else if (isOpen) {
      setSubject('')
      setContent('')
      setTopic('')
      setStylePreset('')
    }
    setError(null)
  }, [isOpen, campaign])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      setError('You must be logged in to create a campaign')
      return
    }

    if (!subject.trim()) {
      setError('Subject is required')
      return
    }

    if (!content.trim()) {
      setError('Content is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const campaignData = {
        subject: subject.trim(),
        content: content.trim(),
        topic: topic || null,
        style_preset: stylePreset || null,
        created_by: user.id,
      }

      if (campaign) {
        // Update existing campaign
        const { error: updateError } = await supabase
          .from('newsletter_campaigns')
          .update(campaignData)
          .eq('id', campaign.id)

        if (updateError) throw updateError
      } else {
        // Create new campaign
        const { error: insertError } = await supabase
          .from('newsletter_campaigns')
          .insert([campaignData])

        if (insertError) throw insertError
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving campaign:', err)
      setError(err.message || 'Failed to save campaign')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.fast),
            ease: motionTokens.easing.standard,
          }}
          className="absolute inset-0 bg-background/90 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  ...cardSpring,
                }
          }
          className="relative z-10 w-full max-w-2xl"
          style={{ height: '90vh', maxHeight: '90vh' }}
        >
          <div
            className={cn(
              'h-full flex flex-col overflow-hidden rounded-xl border-2 bg-card/95 backdrop-blur-md text-card-foreground shadow-card relative'
            )}
            style={{ backgroundColor: 'hsl(var(--card) / 0.95)' }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <ReflectiveGradient />
            </div>
            <div className="relative z-10 h-full flex flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 flex-shrink-0 border-b border-border">
                <div className="flex-1 pr-2">
                  <CardTitle className="text-2xl">
                    {campaign ? 'Edit Campaign' : 'Create Newsletter Campaign'}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {campaign ? 'Update campaign details' : 'Create a new newsletter campaign'}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-6 overflow-y-auto flex-1 min-h-0 pb-12 pr-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Newsletter subject line"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic (Optional)</Label>
                    <select
                      id="topic"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select a topic</option>
                      {TOPICS.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stylePreset">Style Preset (Optional)</Label>
                    <select
                      id="stylePreset"
                      value={stylePreset}
                      onChange={e => setStylePreset(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select a style</option>
                      {STYLE_PRESETS.map(p => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Newsletter content (Markdown supported)"
                      required
                      rows={12}
                      className="font-mono text-sm min-h-[300px] resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      Markdown formatting is supported. Use this for rich text formatting.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
