import type { ReactNode } from 'react'
import { TenantDevModeProvider } from '@/contexts/tenant-dev-mode-context'
import { LandlordDevModeProvider } from '@/contexts/landlord-dev-mode-context'
import { DevModeIndicator } from '@/components/dev-mode-indicator'

/**
 * Wrapper component for providers that need router context (useLocation, etc.)
 * This must be rendered inside RouterProvider
 */
export function ProvidersWrapper({ children }: { children: ReactNode }) {
  return (
    <TenantDevModeProvider>
      <LandlordDevModeProvider>
        <DevModeIndicator />
        {children}
      </LandlordDevModeProvider>
    </TenantDevModeProvider>
  )
}
