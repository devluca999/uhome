import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTenantInvites } from '@/hooks/use-tenant-invites'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { motionTokens, durationToSeconds } from '@/lib/motion'

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getInviteByToken } = useTenantInvites()
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invite, setInvite] = useState<any>(null)

  useEffect(() => {
    if (token) {
      fetchInvite()
    }
  }, [token])

  async function fetchInvite() {
    if (!token) return

    try {
      setLoading(true)
      const result = await getInviteByToken(token)

      if (result.error) {
        setError(result.error.message)
      } else if (result.data) {
        setInvite(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept() {
    if (!token || !invite) return

    setAccepting(true)
    setError(null)

    try {
      // If user is not logged in, redirect to signup/login
      if (!user) {
        // Store token in sessionStorage for after auth
        sessionStorage.setItem('pending_invite_token', token)
        navigate('/signup?invite=true')
        return
      }

      // Check if user email matches invite email
      if (user.email !== invite.email) {
        setError(
          'This invite is for a different email address. Please sign in with the correct account.'
        )
        return
      }

      // Update user role to tenant if needed
      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'tenant' })
        .eq('id', user.id)

      if (roleError) throw roleError

      // Create tenant record
      const { error: tenantError } = await supabase.from('tenants').insert({
        user_id: user.id,
        property_id: invite.property_id,
        move_in_date: new Date().toISOString().split('T')[0],
      })

      if (tenantError) throw tenantError

      // Mark invite as accepted
      const { error: acceptError } = await supabase
        .from('tenant_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      if (acceptError) throw acceptError

      setSuccess(true)

      // Redirect to tenant dashboard after a moment
      setTimeout(() => {
        navigate('/tenant/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.standard,
            }}
          >
            <Card className="glass-card max-w-md">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-6 h-6 text-destructive" />
                  <CardTitle>Invalid Invite</CardTitle>
                </div>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/login">Go to Login</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, scale: 0.95 }}
            animate={{ opacity: motionTokens.opacity.visible, scale: 1 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.standard,
            }}
          >
            <Card className="glass-card max-w-md">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  <CardTitle>Invite Accepted!</CardTitle>
                </div>
                <CardDescription>
                  You&apos;ve been successfully added to {invite?.property?.name || 'the property'}.
                  Redirecting to your dashboard...
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: motionTokens.duration.normal,
            ease: motionTokens.easing.standard,
          }}
        >
          <Card className="glass-card max-w-md">
            <CardHeader>
              <CardTitle>Accept Invitation</CardTitle>
              <CardDescription>
                You&apos;ve been invited to join {invite?.property?.name || 'a property'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invite && (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Property:</span>
                    <p className="font-medium">{invite.property?.name}</p>
                  </div>
                  {invite.property?.address && (
                    <div>
                      <span className="text-muted-foreground">Address:</span>
                      <p className="font-medium">{invite.property.address}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{invite.email}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleAccept} disabled={accepting || !user} className="flex-1">
                  {accepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept Invitation'
                  )}
                </Button>
                {!user && (
                  <Button variant="outline" asChild>
                    <Link to="/signup">Sign Up First</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
