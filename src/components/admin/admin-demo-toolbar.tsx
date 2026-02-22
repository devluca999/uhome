/**
 * Floating toolbar shown when admin is viewing as Landlord or Tenant (demo mode).
 * Contains AdminViewSwitcher + DemoModeBadge. Renders in landlord/tenant layouts.
 */

import { useAuth } from '@/contexts/auth-context'
import { DraggableDemoSelector } from './draggable-demo-selector'

export function AdminDemoToolbar() {
  const { role, viewMode } = useAuth()

  if (role !== 'admin' || viewMode === 'admin') return null

  return <DraggableDemoSelector />
}
