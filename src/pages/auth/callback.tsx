import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'

export function AuthCallback() {
  const navigate = useNavigate()
  const { role } = useAuth()

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          navigate('/login')
          return
        }

        if (data.session) {
          // Wait a bit for role to be fetched
          setTimeout(() => {
            let redirectPath: string
            if (role === 'landlord') {
              redirectPath = '/landlord/dashboard'
            } else if (role === 'tenant') {
              redirectPath = '/tenant/dashboard'
            } else {
              // Unknown role - redirect to login to resolve
              redirectPath = '/login'
            }
            navigate(redirectPath)
          }, 500)
        } else {
          navigate('/login')
        }
      } catch (error) {
        console.error('Error handling callback:', error)
        navigate('/login')
      }
    }

    handleCallback()
  }, [navigate, role])

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-600">Completing sign in...</div>
    </div>
  )
}
