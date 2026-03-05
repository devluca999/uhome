/**
 * Stripe Connect Client
 *
 * Handles Stripe Connect account management and onboarding.
 * Requires @stripe/stripe-js package to be installed.
 */

/**
 * Create Stripe Connect account onboarding link
 *
 * @param propertyId - Property ID to associate with Connect account
 * @param returnUrl - URL to return to after onboarding
 */
export async function createConnectOnboardingLink(
  propertyId: string,
  returnUrl: string
): Promise<{ url: string } | { error: Error }> {
  try {
    const { supabase } = await import('@/lib/supabase/client')

    const { data, error } = await supabase.functions.invoke('create-connect-account', {
      body: {
        property_id: propertyId,
        return_url: returnUrl,
      },
    })

    if (error) throw error
    return { url: data.onboarding_url }
  } catch (err) {
    return { error: err as Error }
  }
}

/**
 * Get Connect account status for a property
 */
export async function getConnectAccountStatus(
  propertyId: string
): Promise<{ accountId: string | null; onboardingStatus: string } | { error: Error }> {
  try {
    const { supabase } = await import('@/lib/supabase/client')

    const { data, error } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, onboarding_status')
      .eq('property_id', propertyId)
      .maybeSingle()

    if (error) throw error

    return {
      accountId: data?.account_id || null,
      onboardingStatus: data?.onboarding_status || 'pending',
    }
  } catch (err) {
    return { error: err as Error }
  }
}

/**
 * Check if property has active Connect account
 */
export async function hasActiveConnectAccount(propertyId: string): Promise<boolean> {
  const result = await getConnectAccountStatus(propertyId)
  if ('error' in result) return false
  return result.onboardingStatus === 'complete' && result.accountId !== null
}
