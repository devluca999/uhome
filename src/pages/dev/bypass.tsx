import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function DevBypass() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') || 'landlord'

  useEffect(() => {
    // Only allow in development
    if (import.meta.env.DEV) {
      const redirectPath = role === 'tenant' ? '/tenant/dashboard' : '/landlord/dashboard'

      // Store dev bypass flag in sessionStorage
      sessionStorage.setItem('dev_bypass', 'true')
      sessionStorage.setItem('dev_role', role)

      navigate(redirectPath, { replace: true })
    } else {
      // In production, redirect to login
      navigate('/login', { replace: true })
    }
  }, [navigate, role])

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-600">Redirecting...</div>
    </div>
  )
}
