import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProperties } from '@/hooks/use-properties'
import { useTenantInvites } from '@/hooks/use-tenant-invites'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { Copy, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TenantInviteFormProps {
  onCancel?: () => void
  onSuccess?: (inviteUrl: string) => void
}

export function TenantInviteForm({ onCancel, onSuccess }: TenantInviteFormProps) {
  const { properties } = useProperties()
  const { createInvite } = useTenantInvites()
  const [email, setEmail] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const buttonSpring = createSpring('button')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!propertyId) {
      setError('Property is required')
      return
    }

    setLoading(true)
    try {
      const result = await createInvite({
        property_id: propertyId,
        email: email.trim(),
      })

      if (result.error) {
        setError(result.error.message)
      } else if (result.data) {
        setInviteUrl(result.data.url)
        onSuccess?.(result.data.url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (inviteUrl) {
    return (
      <motion.div
        initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
        animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
        transition={{
          duration: motionTokens.duration.normal,
          ease: motionTokens.easing.standard,
        }}
        className="space-y-4"
      >
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium text-foreground mb-2">Invite link generated!</p>
          <p className="text-xs text-muted-foreground mb-3">
            Share this link with the tenant. They can accept it to unlock tenant UI access.
          </p>
          <div className="flex items-center gap-2">
            <Input value={inviteUrl} readOnly className="flex-1 text-sm font-mono" />
            <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setInviteUrl(null)
              setEmail('')
              setPropertyId('')
            }}
            className="flex-1"
          >
            Create Another
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Done
            </Button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.standard,
      }}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Tenant Email *
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tenant@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="property" className="text-sm font-medium text-foreground">
          Property *
        </label>
        <select
          id="property"
          value={propertyId}
          onChange={e => setPropertyId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        >
          <option value="" className="text-foreground">
            Select property
          </option>
          {properties.map(prop => (
            <option key={prop.id} value={prop.id} className="text-foreground">
              {prop.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Generating...' : 'Generate Invite Link'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </motion.form>
  )
}
