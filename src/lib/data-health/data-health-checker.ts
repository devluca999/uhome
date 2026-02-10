/**
 * Data Health Checker
 * 
 * Validates data availability and environment configuration.
 * Helps identify why data might be missing or not persisting.
 */

import { supabase } from '@/lib/supabase/client'

export interface DataHealthIssue {
  type: 'missing_data' | 'env_mismatch' | 'auth_mismatch' | 'metrics_not_logging'
  severity: 'error' | 'warning' | 'info'
  message: string
  fix?: string
}

export interface DataHealthStatus {
  isHealthy: boolean
  issues: DataHealthIssue[]
  recommendations: string[]
  stats?: {
    propertiesCount: number
    rentRecordsCount: number
    adminMetricsCount: number
  }
}

/**
 * Check data health for a user
 */
export async function checkDataHealth(
  userId: string,
  userRole: 'landlord' | 'tenant' | 'admin' | null
): Promise<DataHealthStatus> {
  const issues: DataHealthIssue[] = []
  const recommendations: string[] = []
  let stats: DataHealthStatus['stats'] = {
    propertiesCount: 0,
    rentRecordsCount: 0,
    adminMetricsCount: 0,
  }

  try {
    // Check for landlord data
    if (userRole === 'landlord') {
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', userId)

      if (propertiesError) {
        issues.push({
          type: 'missing_data',
          severity: 'error',
          message: `Error checking properties: ${propertiesError.message}`,
          fix: 'Check your database connection and RLS policies',
        })
      } else {
        const propertiesCount = properties?.length || 0
        stats.propertiesCount = propertiesCount

        if (propertiesCount === 0) {
          issues.push({
            type: 'missing_data',
            severity: 'error',
            message: 'No properties found for your account',
            fix: 'Run `npm run seed:mock` to create demo data, or log in as landlord@example.com',
          })
          recommendations.push('Run the seed script: npm run seed:mock')
          recommendations.push('Or log in as the demo landlord: landlord@example.com / password123')
        }

        // Check rent records if properties exist
        if (propertiesCount > 0) {
          const propertyIds = properties.map(p => p.id)
          const { data: rentRecords, error: rentError } = await supabase
            .from('rent_records')
            .select('id')
            .in('property_id', propertyIds)
            .limit(1)

          if (!rentError) {
            const rentRecordsCount = rentRecords?.length || 0
            stats.rentRecordsCount = rentRecordsCount

            if (rentRecordsCount === 0) {
              issues.push({
                type: 'missing_data',
                severity: 'info', // Changed from warning to info - not critical for demo
                message: 'No rent records found for your properties',
                fix: 'Run `npm run seed:mock` to create historical rent data. This is normal if you just created your account.',
              })
              recommendations.push('Run the seed script to generate rent records')
            }
          }
        }
      }
    }

    // Check for tenant data
    if (userRole === 'tenant') {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, property_id, move_in_date, lease_end_date')
        .eq('user_id', userId)
        .limit(1)
        .single()

      if (tenantError) {
        issues.push({
          type: 'missing_data',
          severity: 'error',
          message: `Error checking tenant data: ${tenantError.message}`,
          fix: 'Check your database connection and RLS policies',
        })
      } else if (!tenant) {
        issues.push({
          type: 'missing_data',
          severity: 'error',
          message: 'No tenant record found for your account',
          fix: 'Contact your landlord to be assigned to a property, or run `npm run seed:mock` to create demo data',
        })
        recommendations.push('Run the seed script: npm run seed:mock')
        recommendations.push('Or contact your landlord to be assigned to a property')
      } else {
        // Check if tenant has an active lease (with 30-day grace period for demo data)
        const now = new Date()
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const hasActiveLease = tenant.move_in_date && tenant.lease_end_date
          ? new Date(tenant.move_in_date) <= thirtyDaysFromNow && new Date(tenant.lease_end_date) >= thirtyDaysAgo
          : false

        // Only warn if lease is clearly expired (more than 30 days ago) or far in the future
        if (!hasActiveLease && tenant.move_in_date && tenant.lease_end_date) {
          const startDate = new Date(tenant.move_in_date)
          const endDate = new Date(tenant.lease_end_date)
          const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const daysSinceEnd = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
          
          // Only show warning if lease is more than 30 days expired or more than 30 days in the future
          if (daysSinceEnd > 30 || daysUntilStart > 30) {
            issues.push({
              type: 'missing_data',
              severity: 'info', // Changed from warning to info - not critical
              message: 'Your lease dates are outside the current period',
              fix: 'This is normal for demo data. Contact your landlord if this is unexpected.',
            })
          }
        }

        // Check if tenant is assigned to a property
        if (!tenant.property_id) {
          issues.push({
            type: 'missing_data',
            severity: 'error',
            message: 'You are not assigned to any property',
            fix: 'Contact your landlord to be assigned to a property',
          })
          recommendations.push('Contact your landlord to be assigned to a property')
        } else {
          // Check if property exists and is active
          const { data: property, error: propertyError } = await supabase
            .from('properties')
            .select('id, is_active')
            .eq('id', tenant.property_id)
            .limit(1)
            .single()

          if (propertyError) {
            issues.push({
              type: 'missing_data',
              severity: 'warning',
              message: `Error checking property: ${propertyError.message}`,
              fix: 'Check your database connection',
            })
          } else if (!property) {
            issues.push({
              type: 'missing_data',
              severity: 'error',
              message: 'Your assigned property no longer exists',
              fix: 'Contact your landlord to be reassigned to a property',
            })
          } else if (property.is_active === false) {
            issues.push({
              type: 'missing_data',
              severity: 'warning',
              message: 'Your assigned property is marked as inactive',
              fix: 'Contact your landlord if this is unexpected',
            })
          }

          // Check if tenant has rent records (only warn if truly missing, not just for current month)
          // Don't show this as an issue - it's informational only and shouldn't trigger health warnings
        }
      }
    }

    // Check for admin metrics
    if (userRole === 'admin') {
      const { data: metrics, error: metricsError } = await supabase
        .from('admin_metrics')
        .select('id')
        .limit(1)

      if (!metricsError) {
        const adminMetricsCount = metrics?.length || 0
        stats.adminMetricsCount = adminMetricsCount

        if (adminMetricsCount === 0) {
          issues.push({
            type: 'metrics_not_logging',
            severity: 'warning',
            message: 'No admin metrics found in database',
            fix: 'Verify that the log-metrics Edge Function is deployed and CORS is configured',
          })
          recommendations.push('Deploy the log-metrics Edge Function with CORS fixes')
          recommendations.push('Use the app to generate metrics (navigate pages, make API calls)')
        }
      }
    }

    // Check environment (dev mode only)
    if (import.meta.env.DEV) {
      const appUrl = import.meta.env.VITE_SUPABASE_URL
      if (!appUrl) {
        issues.push({
          type: 'env_mismatch',
          severity: 'error',
          message: 'VITE_SUPABASE_URL is not set in app environment',
          fix: 'Check your .env.local file and ensure VITE_SUPABASE_URL is set',
        })
      }
    }
  } catch (error) {
    issues.push({
      type: 'missing_data',
      severity: 'error',
      message: `Error checking data health: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fix: 'Check your database connection and try again',
    })
  }

  const isHealthy = issues.filter(i => i.severity === 'error').length === 0

  return {
    isHealthy,
    issues,
    recommendations,
    stats,
  }
}

/**
 * Check if environment variables match between seed script and app
 */
export function checkEnvCongruence(): {
  isCongruent: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  // In browser, we can only check app env vars
  // Full congruence check should be done via verify-env-congruence.ts script
  const appUrl = import.meta.env.VITE_SUPABASE_URL
  
  if (!appUrl) {
    issues.push('VITE_SUPABASE_URL is not set in app environment')
  }

  return {
    isCongruent: issues.length === 0,
    issues,
  }
}
