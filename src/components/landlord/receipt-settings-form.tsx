import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useReceiptSettings } from '@/hooks/use-receipt-settings'
import { motion } from 'framer-motion'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'

export function ReceiptSettingsForm() {
  const { settings, loading, createOrUpdateSettings } = useReceiptSettings()
  const [headerText, setHeaderText] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [footerNote, setFooterNote] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (settings) {
      setHeaderText(settings.header_text || '')
      setLogoUrl(settings.logo_url || '')
      setFooterNote(settings.footer_note || '')
      setCurrency(settings.currency || 'USD')
      setDateFormat(settings.date_format || 'MM/DD/YYYY')
    }
  }, [settings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    setSaving(true)
    const result = await createOrUpdateSettings({
      header_text: headerText.trim() || null,
      logo_url: logoUrl.trim() || null,
      footer_note: footerNote.trim() || null,
      currency: currency || 'USD',
      date_format: dateFormat || 'MM/DD/YYYY',
    })
    setSaving(false)

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Receipt Settings</CardTitle>
          <CardDescription>Customize the appearance of your rent receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/30">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                Settings saved successfully
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="header_text" className="text-sm font-medium text-foreground">
                Header Text
              </label>
              <Input
                id="header_text"
                value={headerText}
                onChange={e => setHeaderText(e.target.value)}
                placeholder="Leave empty to use property name"
                disabled={loading || saving}
              />
              <p className="text-xs text-muted-foreground">
                Custom header text for receipts. If empty, property name will be used.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="logo_url" className="text-sm font-medium text-foreground">
                Logo URL
              </label>
              <Input
                id="logo_url"
                type="url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={loading || saving}
              />
              <p className="text-xs text-muted-foreground">URL to your logo image (optional)</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="footer_note" className="text-sm font-medium text-foreground">
                Footer Note
              </label>
              <textarea
                id="footer_note"
                value={footerNote}
                onChange={e => setFooterNote(e.target.value)}
                placeholder="Thank you for your payment..."
                rows={3}
                disabled={loading || saving}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">Optional footer text for receipts</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="currency" className="text-sm font-medium text-foreground">
                  Currency
                </label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={e => setCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  disabled={loading || saving}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="date_format" className="text-sm font-medium text-foreground">
                  Date Format
                </label>
                <select
                  id="date_format"
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value)}
                  disabled={loading || saving}
                  className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="MM/DD/YYYY" className="text-foreground">
                    MM/DD/YYYY
                  </option>
                  <option value="DD/MM/YYYY" className="text-foreground">
                    DD/MM/YYYY
                  </option>
                  <option value="YYYY-MM-DD" className="text-foreground">
                    YYYY-MM-DD
                  </option>
                  <option value="DD MMM YYYY" className="text-foreground">
                    DD MMM YYYY
                  </option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading || saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
