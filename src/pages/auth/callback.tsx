import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { getPostLoginRedirectPath } from '@/lib/post-login-routing'
import { getPendingInviteToken, buildAcceptInvitePath } from '@/lib/pending-invite'
import { logFlowError, logFlowWarn } from '@/lib/flow-log'

export function AuthCallback() {
  const navigate = useNavigate()
  const { role, loading } = useAuth()
  const handled = useRef(false)

  // Phase 1: verify session exists immediately after OAuth redirect
  useEffect(() => {
    if (handled.current) return

    async function verifySession() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          logFlowError('AuthCallback', 'getSession', error)
          handled.current = true
          navigate('/login', {
            replace: true,
            state: {
              authCallbackError:
                'We could not complete sign-in. Please try again, or use email and password.',
            },
          })
          return
        }

        if (!data.session) {
          logFlowWarn('AuthCallback', 'getSession', 'No session after OAuth redirect')
          handled.current = true
          navigate('/login', {
            replace: true,
            state: {
              authCallbackError: 'Sign-in did not finish. Please try again from the login page.',
            },
          })
          return
        }

        // Session confirmed — Phase 2 will handle redirect once role resolves
      } catch (error) {
        logFlowError('AuthCallback', 'verifySession', error)
        handled.current = true
        navigate('/login', {
          replace: true,
          state: {
            authCallbackError: 'Something went wrong completing sign-in. Please try again.',
          },
        })
      }
    }

    verifySession()
  }, [navigate])

  // Phase 2: redirect once auth context has resolved role
  useEffect(() => {
    if (handled.current) return
    if (loading) return // still fetching — wait

    if (role) {
      handled.current = true
      const pending = getPendingInviteToken()
      if (pending) {
        navigate(buildAcceptInvitePath(pending), { replace: true })
      } else {
        navigate(getPostLoginRedirectPath(role), { replace: true })
      }
      return
    }

    // loading is false but role is null — new Google/OAuth user with no role set
    if (!loading) {
      handled.current = true
      navigate('/auth/role-selection', { replace: true })
    }
  }, [navigate, role, loading])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Completing sign in...</div>
    </div>
  )
}
