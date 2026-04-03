import { Navigate, useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext, type ViewMode } from '@/contexts/auth-context'
import { logFlowWarn } from '@/lib/flow-log'
import { useSubscription } from '@/hooks/use-subscription'
import { TrialExpiredPaywall } from '@/components/billing/trial-expired-paywall'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('landlord' | 'tenant' | 'admin')[]
}

function isRoleAllowed(
  allowedRoles: ('landlord' | 'tenant' | 'admin')[],
  role: 'landlord' | 'tenant' | 'admin' | null,
  viewMode: ViewMode
): boolean {
  if (!role || !allowedRoles.length) return false
  return allowedRoles.some(r => {
    if (r === 'admin') return role === 'admin'
    if (r === 'landlord')
      return role === 'landlord' || (role === 'admin' && viewMode === 'landlord-demo')
    if (r === 'tenant') return role === 'tenant' || (role === 'admin' && viewMode === 'tenant-demo')
    return false
  })
}

function PaywallGate({ children }: { children: React.ReactNode }) {
  const { role } = useContext(AuthContext)!
  const { isLocked, loading } = useSubscription()

  // Only gate landlords — tenants are always free
  if (!loading && role === 'landlord' && isLocked) {
    return <TrialExpiredPaywall />
  }

  return <>{children}</>
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const authContext = useContext(AuthContext)
  const location = useLocation()

  if (!authContext) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Authentication error. Please refresh the page.</div>
      </div>
    )
  }

  const { user, role, loading, viewMode } = authContext

  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'
  const devRole = sessionStorage.getItem('dev_role') as 'landlord' | 'tenant' | 'admin' | null

  if (loading && !devBypass) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    )
  }

  if (devBypass && devRole) {
    if (allowedRoles && !allowedRoles.includes(devRole)) {
      const redirectPath =
        devRole === 'admin' ? '/admin/overview'
        : devRole === 'landlord' ? '/landlord/dashboard'
        : '/tenant/dashboard'
      return <Navigate to={redirectPath} replace />
    }
    return <>{children}</>
  }

  if (!user && !devBypass) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role) {
    if (!isRoleAllowed(allowedRoles, role, viewMode)) {
      logFlowWarn('ProtectedRoute', 'roleMismatch', 'Redirecting to role-appropriate route', {
        path: location.pathname, role, viewMode, allowed: allowedRoles.join(','),
      })
      if (role === 'admin') {
        const target =
          viewMode === 'landlord-demo' ? '/landlord/dashboard'
          : viewMode === 'tenant-demo' ? '/tenant/dashboard'
          : '/admin/overview'
        return <Navigate to={target} replace />
      } else if (role === 'landlord') {
        return <Navigate to="/landlord/dashboard" replace />
      } else if (role === 'tenant') {
        return <Navigate to="/tenant/dashboard" replace />
      }
      return <Navigate to="/login" replace />
    }

    // Paywall gate — only for landlord routes, skips admin/tenant
    if (allowedRoles.includes('landlord') && !allowedRoles.includes('admin')) {
      return <PaywallGate>{children}</PaywallGate>
    }

    return <>{children}</>
  }

  if (allowedRoles && !role && user && loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    )
  }

  if (allowedRoles && !role && user && !loading) {
    return <Navigate to="/login" state={{ from: location, roleError: true }} replace />
  }

  return <>{children}</>
}
