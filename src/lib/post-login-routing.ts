/**
 * Centralized post-login redirect logic for RBAC.
 * Admin -> /admin/overview, Landlord -> /landlord/dashboard, Tenant -> /tenant/dashboard
 */

type UserRole = 'landlord' | 'tenant' | 'admin' | null

export function getPostLoginRedirectPath(role: UserRole): string {
  if (role === 'admin') return '/admin/overview'
  if (role === 'landlord') return '/landlord/dashboard'
  if (role === 'tenant') return '/tenant/dashboard'
  return '/login'
}
