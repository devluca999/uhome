import { supabase } from '@/lib/supabase/client'
import type { DemoState, ViewMode } from '@/contexts/auth-context'
import { DEMO_LANDLORD_CREDENTIALS } from '@/lib/tenant-dev-mode'

type UserRole = 'landlord' | 'tenant' | 'admin' | null

/**
 * Owner id used for landlord-scoped DB queries (properties, tenants, expenses, etc.).
 * When an admin uses Landlord Demo + Populated, seeded data lives under the demo landlord
 * account (`demo-landlord@uhome.internal`), not the admin's auth uid.
 */
export async function resolveLandlordDataOwnerId(params: {
  role: UserRole
  viewMode: ViewMode
  demoState: DemoState
  sessionUserId: string | undefined
}): Promise<string | null> {
  const { role, viewMode, demoState, sessionUserId } = params

  if (role === 'admin' && viewMode === 'landlord-demo' && demoState === 'populated') {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', DEMO_LANDLORD_CREDENTIALS.email)
      .maybeSingle()

    const resolved = data?.id ?? sessionUserId ?? null

    if (import.meta.env.DEV) {
      console.log('[landlord-demo:populated] data query ownerId', {
        resolvedOwnerId: resolved,
        demoLandlordEmail: DEMO_LANDLORD_CREDENTIALS.email,
        userLookupHit: !!data?.id,
        userLookupError: error?.message,
        sessionUserId,
      })
    }

    return resolved
  }

  return sessionUserId ?? null
}
