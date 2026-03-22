import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { getPostLoginRedirectPath } from '@/lib/post-login-routing'
import { getPendingInviteToken, buildAcceptInvitePath } from '@/lib/pending-invite'
import { logFlowError, logFlowWarn } from '@/lib/flow-log'

export function AuthCallback() {
  const navigate = useNavigate()
  const { role, loading } = useAuth()

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          logFlowError('AuthCallback', 'getSession', error)
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
          navigate('/login', {
            replace: true,
            state: {
              authCallbackError: 'Sign-in did not finish. Please try again from the login page.',
            },
          })
          return
        }

        // Wait for role to be fetched by auth context
        if (!loading && role) {
          const pending = getPendingInviteToken()
          if (pending) {
            navigate(buildAcceptInvitePath(pending), { replace: true })
          } else {
            navigate(getPostLoginRedirectPath(role))
          }
        } else if (!loading && !role) {
          logFlowError('AuthCallback', 'resolveRole', new Error('Authenticated but role missing'))
          navigate('/login', {
            replace: true,
            state: {
              authCallbackError:
                'Your profile could not be loaded. Try signing in again or contact support if this continues.',
            },
          })
        }
      } catch (error) {
        logFlowError('AuthCallback', 'handleCallback', error)
        navigate('/login', {
          replace: true,
          state: {
            authCallbackError: 'Something went wrong completing sign-in. Please try again.',
          },
        })
      }
    }

    handleCallback()
  }, [navigate, role, loading])

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-600">Completing sign in...</div>
    </div>
  )
}
