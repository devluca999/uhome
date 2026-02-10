/**
 * Messaging Helper Functions
 * 
 * Utilities for navigating to messaging with proper lease context
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Get or create a lease for a tenant (for messaging purposes)
 * Returns the lease_id that should be used for messaging
 */
export async function getOrCreateLeaseForMessaging(
  tenantId: string,
  propertyId: string
): Promise<string | null> {
  try {
    // First, try to find an active lease for this tenant
    const { data: existingLease, error: fetchError } = await supabase
      .from('leases')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('property_id', propertyId)
      .or('status.eq.active,status.eq.draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error fetching lease:', fetchError)
      return null
    }

    if (existingLease) {
      return existingLease.id
    }

    // If no lease exists, we can't create one automatically
    // (requires landlord action to create lease)
    // Return null to indicate no lease available
    return null
  } catch (error) {
    console.error('Error in getOrCreateLeaseForMessaging:', error)
    return null
  }
}

/**
 * Build messaging URL with lease and optional intent
 */
export function buildMessagingUrl(
  leaseId: string | null,
  intent?: 'general' | 'maintenance' | 'billing' | 'notice',
  role: 'landlord' | 'tenant' = 'landlord'
): string {
  const basePath = role === 'landlord' ? '/landlord/messages' : '/tenant/messages'
  
  if (!leaseId) {
    return basePath
  }

  const params = new URLSearchParams()
  params.set('leaseId', leaseId)
  if (intent) {
    params.set('intent', intent)
  }

  return `${basePath}?${params.toString()}`
}

/**
 * Navigate to messaging for a tenant
 * Handles the case where no lease exists yet
 */
export async function navigateToTenantMessaging(
  tenantId: string,
  propertyId: string,
  intent?: 'general' | 'maintenance' | 'billing' | 'notice',
  role: 'landlord' | 'tenant' = 'landlord',
  onNavigate?: (url: string) => void
): Promise<void> {
  const leaseId = await getOrCreateLeaseForMessaging(tenantId, propertyId)
  
  if (!leaseId) {
    // No lease exists - could show a message or navigate to messages page anyway
    // For now, just navigate to messages page (user can see empty state)
    const url = buildMessagingUrl(null, intent, role)
    if (onNavigate) {
      onNavigate(url)
    } else if (typeof window !== 'undefined') {
      window.location.href = url
    }
    return
  }

  const url = buildMessagingUrl(leaseId, intent, role)
  if (onNavigate) {
    onNavigate(url)
  } else if (typeof window !== 'undefined') {
    window.location.href = url
  }
}
