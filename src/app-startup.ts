import * as Sentry from '@sentry/react'
import { appEnvironment } from '@/config/environment'
import {
  assertProductionHostingDoesNotUseStagingSupabase,
  getHostingDeploymentLabel,
  isProductionOrPreviewForLogging,
  isStrictProductionHosting,
} from '@/lib/supabase-hosting-guard'

// Initialize Sentry
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: appEnvironment.kind,
    enabled: true,
    tracesSampleRate: appEnvironment.kind === 'production' ? 1.0 : 0.5,
    // Filter out development errors to reduce noise
    beforeSend(event) {
      if (appEnvironment.kind === 'development') {
        return null // Drop dev errors
      }
      return event
    },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  })
}

const hostingEnv = import.meta.env.VITE_HOSTING_ENV

const hostingLabel = getHostingDeploymentLabel(import.meta.env.DEV, hostingEnv)
const prodOrPreview = isProductionOrPreviewForLogging(
  import.meta.env.DEV,
  import.meta.env.PROD,
  hostingEnv
)

console.info('[uhome] App startup')
console.info(`  Environment: ${appEnvironment.kind} (${appEnvironment.label})`)
console.info(`  Supabase URL: ${appEnvironment.supabaseUrl}`)
console.info(`  Hosting: ${hostingLabel}`)
console.info(`  Production vs preview: ${prodOrPreview}`)
console.info(`  Sentry: ${sentryDsn ? 'enabled' : 'disabled'}`)

assertProductionHostingDoesNotUseStagingSupabase({
  supabaseUrl: appEnvironment.supabaseUrl,
  stagingProjectRefToForbid: import.meta.env.VITE_STAGING_SUPABASE_PROJECT_REF,
  isProductionHosting: isStrictProductionHosting(
    import.meta.env.DEV,
    import.meta.env.PROD,
    hostingEnv,
    appEnvironment.kind
  ),
})
