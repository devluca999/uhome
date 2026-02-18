import { Navigate, useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('landlord' | 'tenant' | 'admin')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const authContext = useContext(AuthContext)
  const location = useLocation()

  // If AuthProvider is not available, show error
  if (!authContext) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Authentication error. Please refresh the page.</div>
      </div>
    )
  }

  const { user, role, loading } = authContext

  // Dev bypass check (only in development)
  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'
  const devRole = sessionStorage.getItem('dev_role') as 'landlord' | 'tenant' | 'admin' | null

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

  // If we have allowed roles and the user has a role, check if they're allowed
  if (allowedRoles && role) {
    if (!allowedRoles.includes(role)) {
      // Redirect to appropriate dashboard based on role
      if (role === 'admin') {
        return <Navigate to="/admin/overview" replace />
      } else if (role === 'landlord') {
        return <Navigate to="/landlord/dashboard" replace />
      } else if (role === 'tenant') {
        return <Navigate to="/tenant/dashboard" replace />
      }
      // If role is unknown, redirect to login
      return <Navigate to="/login" replace />
    }
    // Role matches allowed roles, allow access
    return <>{children}</>
  }

  // If we have allowed roles but role is not yet loaded, wait only while loading
  // Once loading is false and role is still null, role fetch failed - redirect to login
  if (allowedRoles && !role && user && loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    )
  }

  // Role fetch completed but role is null (user not in users table, RLS, etc.)
  if (allowedRoles && !role && user && !loading) {
    return <Navigate to="/login" state={{ from: location, roleError: true }} replace />
  }

  return <>{children}</>
}
