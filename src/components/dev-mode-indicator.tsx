/**
 * Dev Mode Indicator Component
 *
 * Displays a visual badge when dev mode is active to prevent confusion
 * and clearly indicate that the app is using staging database/dev data.
 */

import { isDevModeActive } from '@/lib/tenant-dev-mode'

export function DevModeIndicator() {
  const activeMode = isDevModeActive()

  if (!activeMode) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 px-3 py-1.5 bg-amber-500/90 text-amber-950 text-xs font-semibold rounded-md shadow-lg border border-amber-600/30 backdrop-blur-sm">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-amber-950 rounded-full animate-pulse" />
        Dev Mode ({activeMode === 'tenant' ? 'Tenant' : 'Landlord'})
      </span>
    </div>
  )
}
