import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link2, Loader2 } from 'lucide-react'
import { extractTokenFromInviteInput } from '@/lib/invite-token'
import { logFlowError, logFlowWarn } from '@/lib/flow-log'

interface JoinHouseholdFormProps {
  onCancel?: () => void
}

export function JoinHouseholdForm({ onCancel }: JoinHouseholdFormProps) {
  const [inviteLink, setInviteLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { role } = useAuth()

  // Role guard: Prevent non-tenants from using this component
  useEffect(() => {
    if (role && role !== 'tenant') {
      navigate('/landlord/dashboard', { replace: true })
    }
  }, [role, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const token = extractTokenFromInviteInput(inviteLink.trim())

      if (!token) {
        logFlowWarn('JoinHousehold', 'parseInviteInput', 'Could not extract token from input')
        setError('Invalid invite link. Please enter a valid invite URL or token.')
        setLoading(false)
        return
      }

      setLoading(false)
      navigate(`/accept-invite?token=${encodeURIComponent(token)}`)
    } catch (err) {
      logFlowError('JoinHousehold', 'handleSubmit', err)
      setError(err instanceof Error ? err.message : 'Failed to process invite link')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/20 rounded-md border border-destructive/30">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="invite-link" className="text-sm font-medium text-foreground">
          Invite Link or Token
        </label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="invite-link"
            type="text"
            placeholder="https://example.com/accept-invite?token=… or legacy /accept-invite/…"
            value={inviteLink}
            onChange={e => setInviteLink(e.target.value)}
            className="pl-10"
            disabled={loading}
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Paste the invite link your landlord sent you, or just the invite token
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Join Household'
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
