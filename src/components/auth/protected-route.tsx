import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('landlord' | 'tenant')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  // Dev bypass check (only in development)
  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'
  const devRole = sessionStorage.getItem('dev_role') as 'landlord' | 'tenant' | null

  if (loading && !devBypass) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    )
  }

  // Allow dev bypass in development mode
  if (devBypass && devRole) {
    if (allowedRoles && !allowedRoles.includes(devRole)) {
      // Redirect to appropriate dashboard based on dev role
      const redirectPath = devRole === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard'
      return <Navigate to={redirectPath} replace />
    }
    return <>{children}</>
  }

  if (!user && !devBypass) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}
