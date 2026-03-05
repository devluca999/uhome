/**
 * Feature Flag Utility
 *
 * Simple feature flag system that checks environment variables.
 * For Phase 8, this will be enhanced with database-backed feature flags.
 */

const FEATURE_FLAGS: Record<string, boolean> = {
  ENABLE_TENANT_VIEW_MODES: import.meta.env.VITE_ENABLE_TENANT_VIEW_MODES !== 'false',
  ENABLE_MESSAGING_ENTRY_POINTS: import.meta.env.VITE_ENABLE_MESSAGING_ENTRY_POINTS !== 'false',
  ENABLE_EMAIL_NOTIFICATIONS: import.meta.env.VITE_ENABLE_EMAIL_NOTIFICATIONS === 'true',
  ENABLE_PUSH_NOTIFICATIONS: import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',
  ENABLE_STRIPE_CONNECT: import.meta.env.VITE_ENABLE_STRIPE_CONNECT === 'true',
  ENABLE_ADMIN_WAITLIST: import.meta.env.VITE_ENABLE_ADMIN_WAITLIST !== 'false',
  ENABLE_ADMIN_PROMOTIONS: import.meta.env.VITE_ENABLE_ADMIN_PROMOTIONS !== 'false',
  ENABLE_ADMIN_NEWSLETTER: import.meta.env.VITE_ENABLE_ADMIN_NEWSLETTER !== 'false',
  ENABLE_ADMIN_LEADS: import.meta.env.VITE_ENABLE_ADMIN_LEADS !== 'false',
  ENABLE_RELEASE_TRACKING: import.meta.env.VITE_ENABLE_RELEASE_TRACKING !== 'false',
  ENABLE_STAGING_WORKFLOW: import.meta.env.VITE_ENABLE_STAGING_WORKFLOW !== 'false',
  ENABLE_MANUAL_LEAD_UPLOAD: import.meta.env.VITE_ENABLE_MANUAL_LEAD_UPLOAD !== 'false',
  ENABLE_DIRECT_SCRAPER_INGESTION: import.meta.env.VITE_ENABLE_DIRECT_SCRAPER_INGESTION === 'true',
  ENABLE_API_LEAD_INGESTION: import.meta.env.VITE_ENABLE_API_LEAD_INGESTION === 'true',
  ENABLE_LEAD_INGESTION_SANDBOX: import.meta.env.VITE_ENABLE_LEAD_INGESTION_SANDBOX !== 'false',
  ENABLE_GDPR_COMPLIANCE: import.meta.env.VITE_ENABLE_GDPR_COMPLIANCE !== 'false',
  ENABLE_CCPA_COMPLIANCE: import.meta.env.VITE_ENABLE_CCPA_COMPLIANCE !== 'false',
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: string): boolean {
  return FEATURE_FLAGS[flag] ?? false
}

/**
 * Get all feature flags (for debugging/admin)
 */
export function getAllFeatureFlags(): Record<string, boolean> {
  return { ...FEATURE_FLAGS }
}
