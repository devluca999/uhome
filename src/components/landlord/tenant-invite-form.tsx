import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProperties } from '@/hooks/use-properties'
import { useTenantInvites } from '@/hooks/use-tenant-invites'
import { supabase } from '@/lib/supabase/client'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { Copy, Check, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TenantInviteFormProps {
  onCancel?: () => void
  onSuccess?: (inviteUrl: string) => void
  propertyId?: string
}

export function TenantInviteForm({
  onCancel,
  onSuccess,
  propertyId: initialPropertyId,
}: TenantInviteFormProps) {
  const { properties } = useProperties()
  const { createInvite } = useTenantInvites()
  const [email, setEmail] = useState('')
  const [propertyId, setPropertyId] = useState(initialPropertyId || '')
  const [leaseType, setLeaseType] = useState<'short-term' | 'long-term'>('long-term')
  const [expectedStartDate, setExpectedStartDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasPreviousLease, setHasPreviousLease] = useState(false)
  const [checkingPreviousLease, setCheckingPreviousLease] = useState(false)
  const buttonSpring = createSpring('button')

  // Check for previous leases when email and property are set
  useEffect(() => {
    if (email.trim() && propertyId) {
      checkPreviousLease()
    } else {
      setHasPreviousLease(false)
    }
  }, [email, propertyId])

  async function checkPreviousLease() {
    setCheckingPreviousLease(true)
    try {
      // Check if there's a user with this email
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim())
        .single()

      if (user) {
        // Check if this user has a tenant record
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (tenant) {
          // Check if this tenant had an ended lease at this property
          const { data: endedLeases } = await supabase
            .from('leases')
            .select('id')
            .eq('property_id', propertyId)
            .eq('tenant_id', tenant.id)
            .eq('status', 'ended')
            .limit(1)

          setHasPreviousLease((endedLeases?.length ?? 0) > 0)
        } else {
          setHasPreviousLease(false)
        }
      } else {
        setHasPreviousLease(false)
      }
    } catch (err) {
      // Silently fail - this is just for informational purposes
      setHasPreviousLease(false)
    } finally {
      setCheckingPreviousLease(false)
    }
  }

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
        lease_type: leaseType,
        expected_start_date: expectedStartDate || undefined,
      })

      if (result.error) {
        setError(result.error.message)
      } else if (result.data) {
        setInviteUrl(result.data.url)
        setHasPreviousLease(result.data.hasPreviousLease || false)
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
            Share this link with the tenant. They&apos;ll be able to message you and access lease
            information.
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

      {hasPreviousLease && (
        <div className="p-3 rounded-md bg-primary/10 border border-primary/20 flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            This will start a new lease. Past records will remain archived.
          </p>
        </div>
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

      {!initialPropertyId && (
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
      )}

      <div className="space-y-2">
        <label htmlFor="lease_type" className="text-sm font-medium text-foreground">
          Lease Type
        </label>
        <select
          id="lease_type"
          value={leaseType}
          onChange={e => setLeaseType(e.target.value as 'short-term' | 'long-term')}
          className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="long-term" className="text-foreground">
            Long-term
          </option>
          <option value="short-term" className="text-foreground">
            Short-term
          </option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="expected_start_date" className="text-sm font-medium text-foreground">
          Expected Start Date (Optional)
        </label>
        <Input
          id="expected_start_date"
          type="date"
          value={expectedStartDate}
          onChange={e => setExpectedStartDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to start immediately when tenant accepts
        </p>
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
