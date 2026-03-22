import { appEnvironment } from '@/config/environment'
import {
  assertProductionHostingDoesNotUseStagingSupabase,
  getHostingDeploymentLabel,
  isProductionOrPreviewForLogging,
  isStrictProductionHosting,
} from '@/lib/supabase-hosting-guard'

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
