import { isDevelopment, isProduction, isStaging } from '@/config/environment'

/**
 * Visual indicator for non-production deployments. Hidden when VITE_ENVIRONMENT=production.
 */
export function EnvironmentBadge() {
  if (isProduction) return null

  if (isDevelopment) {
    return (
      <div
        role="status"
        aria-label="Development environment"
        className="pointer-events-none fixed bottom-4 right-4 z-[100]"
      >
        <span className="rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white shadow-md">
          DEV
        </span>
      </div>
    )
  }

  if (isStaging) {
    return (
      <div
        role="status"
        aria-label="Staging environment"
        className="pointer-events-none fixed bottom-4 right-4 z-[100]"
      >
        <span className="rounded-md bg-orange-500 px-2 py-1 text-xs font-semibold text-white shadow-md">
          STAGING
        </span>
      </div>
    )
  }

  return null
}
