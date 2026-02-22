import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { getPostLoginRedirectPath } from '@/lib/post-login-routing'

export function AuthCallback() {
  const navigate = useNavigate()
  const { role, loading } = useAuth()

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          navigate('/login')
          return
        }

        if (!data.session) {
          navigate('/login')
          return
        }

        // Wait for role to be fetched by auth context
        if (!loading && role) {
          navigate(getPostLoginRedirectPath(role))
        } else if (!loading && !role) {
          navigate('/login')
        }
      } catch (error) {
        console.error('Error handling callback:', error)
        navigate('/login')
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
