import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export function DevBypass() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') || 'landlord'

  useEffect(() => {
    // Only allow in development
    if (!import.meta.env.DEV) {
      navigate('/login', { replace: true })
      return
    }

    async function setupDevBypass() {
      try {
        // Actually sign in as the demo user for dev bypass
        // This ensures RLS policies work correctly since they check auth.uid()
        const email =
          role === 'tenant' ? 'demo-tenant@uhome.internal' : 'demo-landlord@uhome.internal'
        const password = role === 'tenant' ? 'DemoTenant2024!' : 'DemoLandlord2024!'

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          console.warn('Dev bypass: Could not auto-sign in:', error.message)
          console.warn(
            'Dev bypass: Falling back to session-only bypass (data may not load due to RLS)'
          )
        } else {
          console.log('Dev bypass: Successfully authenticated as', email)
        }

        // Store dev bypass flag in sessionStorage for UI routing
        sessionStorage.setItem('dev_bypass', 'true')
        sessionStorage.setItem('dev_role', role)

        const redirectPath =
          role === 'admin'
            ? '/admin/overview'
            : role === 'tenant'
              ? '/tenant/dashboard'
              : '/landlord/dashboard'
        navigate(redirectPath, { replace: true })
      } catch (err) {
        console.error('Dev bypass error:', err)
        navigate('/login')
      }
    }

    setupDevBypass()
  }, [navigate, role])

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-600">Setting up dev mode...</div>
    </div>
  )
}
