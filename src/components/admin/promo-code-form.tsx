import { useState, useEffect } from 'react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

type PromoCode = {
  id: string
  code: string
  type: 'percentage' | 'fixed' | 'trial_extension'
  value: number
  usage_limit: number | null
  expires_at: string | null
  description: string | null
  created_at: string
}

interface PromoCodeFormProps {
  isOpen: boolean
  onClose: () => void
  promoCode?: PromoCode | null
  onSuccess: () => void
}

export function PromoCodeForm({ isOpen, onClose, promoCode, onSuccess }: PromoCodeFormProps) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percentage' | 'fixed' | 'trial_extension'>('percentage')
  const [value, setValue] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()
  useModalScrollLock(isOpen)

  useEffect(() => {
    if (isOpen && promoCode) {
      setCode(promoCode.code || '')
      setType(promoCode.type || 'percentage')
      setValue(promoCode.value?.toString() || '')
      setUsageLimit(promoCode.usage_limit?.toString() || '')
      setExpiresAt(promoCode.expires_at ? promoCode.expires_at.split('T')[0] : '')
      setDescription(promoCode.description || '')
    } else if (isOpen) {
      setCode('')
      setType('percentage')
      setValue('')
      setUsageLimit('')
      setExpiresAt('')
      setDescription('')
    }
    setError(null)
  }, [isOpen, promoCode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      setError('You must be logged in to create a promo code')
      return
    }

    if (!code.trim()) {
      setError('Code is required')
      return
    }

    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      setError('Value must be a positive number')
      return
    }

    if (type === 'percentage' && numValue > 100) {
      setError('Percentage cannot exceed 100%')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const promoData: any = {
        code: code.trim().toUpperCase(),
        type,
        value: numValue,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        expires_at: expiresAt || null,
        description: description.trim() || null,
        created_by: user.id,
      }

      if (promoCode) {
        // Update existing promo code
        const { error: updateError } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', promoCode.id)

        if (updateError) throw updateError
      } else {
        // Create new promo code
        const { error: insertError } = await supabase.from('promo_codes').insert([promoData])

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('A promo code with this code already exists')
          }
          throw insertError
        }
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving promo code:', err)
      setError(err.message || 'Failed to save promo code')
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
          className="relative z-10 w-full max-w-lg"
        >
          <div
            className={cn(
              'flex flex-col overflow-hidden rounded-xl border-2 bg-card/95 backdrop-blur-md text-card-foreground shadow-card relative'
            )}
            style={{ backgroundColor: 'hsl(var(--card) / 0.95)' }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <ReflectiveGradient />
            </div>
            <div className="relative z-10 flex flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 flex-shrink-0 border-b border-border">
                <div className="flex-1 pr-2">
                  <CardTitle className="text-2xl">
                    {promoCode ? 'Edit Promo Code' : 'Create Promo Code'}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {promoCode ? 'Update promo code details' : 'Create a new promo code'}
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

              <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0 pb-12 pr-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="PROMO2024"
                      required
                      disabled={!!promoCode}
                    />
                    {promoCode && (
                      <p className="text-xs text-muted-foreground">
                        Code cannot be changed after creation
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <select
                      id="type"
                      value={type}
                      onChange={e => setType(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="percentage">Percentage Discount</option>
                      <option value="fixed">Fixed Amount Discount</option>
                      <option value="trial_extension">Trial Extension (days)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="value">
                      Value *{' '}
                      <span className="text-xs text-muted-foreground">
                        ({type === 'percentage' ? '0-100%' : type === 'fixed' ? '$' : 'days'})
                      </span>
                    </Label>
                    <Input
                      id="value"
                      type="number"
                      min="0"
                      max={type === 'percentage' ? '100' : undefined}
                      step={type === 'percentage' ? '1' : type === 'fixed' ? '0.01' : '1'}
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      placeholder={type === 'percentage' ? '10' : type === 'fixed' ? '50.00' : '30'}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usageLimit">Usage Limit (Optional)</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      min="1"
                      value={usageLimit}
                      onChange={e => setUsageLimit(e.target.value)}
                      placeholder="Leave empty for unlimited"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of times this code can be used. Leave empty for unlimited.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={expiresAt}
                      onChange={e => setExpiresAt(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Internal description or notes"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Saving...' : promoCode ? 'Update Promo Code' : 'Create Promo Code'}
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
