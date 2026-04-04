import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import type { DemoState, ViewMode } from '@/contexts/auth-context'
import { DEMO_LANDLORD_CREDENTIALS } from '@/lib/tenant-dev-mode'

type UserRole = 'landlord' | 'tenant' | 'admin' | null

/**
 * Owner id used for landlord-scoped DB queries (properties, tenants, expenses, etc.).
 *
 * Resolution rule: only when **admin** + **landlord-demo** + **populated** do we load the
 * demo landlord user id (`demo-landlord@uhome.internal`). Otherwise we use the signed-in
 * user's id. **landlord-demo** + **empty** intentionally keeps the session uid (hooks must
 * short-circuit to empty lists, same as property-service / useTenants).
 */
export async function resolveLandlordDataOwnerId(params: {
  role: UserRole
  viewMode: ViewMode
  demoState: DemoState
  sessionUserId: string | undefined
}): Promise<string | null> {
  const { role, viewMode, demoState, sessionUserId } = params

  if (role === 'admin' && viewMode === 'landlord-demo' && demoState === 'populated') {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', DEMO_LANDLORD_CREDENTIALS.email)
      .maybeSingle()

    return data?.id ?? sessionUserId ?? null
  }

  return sessionUserId ?? null
}

/**
 * Resolved landlord data owner id for the current auth + demo lens. Prefer this in hooks
 * so dependency arrays stay aligned with viewMode / demoState.
 */
export function useLandlordDataOwnerId(): { ownerId: string | null; loading: boolean } {
  const { user, role, viewMode, demoState } = useAuth()
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const id = await resolveLandlordDataOwnerId({
        role,
        viewMode,
        demoState,
        sessionUserId: user?.id,
      })
      if (!cancelled) {
        setOwnerId(id)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, role, viewMode, demoState])

  return { ownerId, loading }
}

export function logLandlordDataOwner(
  scope: string,
  payload: {
    ownerId: string | null
    sessionUserId: string | undefined
    role: UserRole
    viewMode: ViewMode
    demoState: DemoState
    propertyId?: string | null
  }
): void {
  if (!import.meta.env.DEV) return
  console.log(`[${scope}] landlordDataOwnerId`, payload)
}
