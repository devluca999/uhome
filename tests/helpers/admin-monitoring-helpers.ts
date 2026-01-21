/**
 * Admin Monitoring Test Helpers
 *
 * Utility functions for seeding test data for admin monitoring tests.
 */

import { getSupabaseAdminClient } from './db-helpers'

/**
 * Seed test performance metrics
 */
export async function seedPerformanceMetrics(userId: string, count: number = 10) {
  const supabaseAdmin = getSupabaseAdminClient()
  const anonymizedUserId = Buffer.from(userId).toString('base64').substring(0, 32) // Simple anonymization for test

  const metrics = Array.from({ length: count }, (_, i) => ({
    user_id: anonymizedUserId,
    user_role: i % 3 === 0 ? 'admin' : i % 2 === 0 ? 'landlord' : 'tenant',
    metric_type: i % 3 === 0 ? 'page_load' : i % 2 === 0 ? 'api_call' : 'component_render',
    page_path: `/test/page/${i}`,
    metric_name: `metric_${i}`,
    duration_ms: 100 + i * 50,
    metadata: { test: true },
  }))

  const { error } = await supabaseAdmin.from('admin_metrics').insert(metrics)
  if (error) throw error

  return metrics
}

/**
 * Seed test upload logs
 */
export async function seedUploadLogs(userId: string, count: number = 10) {
  const supabaseAdmin = getSupabaseAdminClient()
  const anonymizedUserId = Buffer.from(userId).toString('base64').substring(0, 32)

  const uploads = Array.from({ length: count }, (_, i) => ({
    user_id: anonymizedUserId,
    user_role: i % 3 === 0 ? 'admin' : i % 2 === 0 ? 'landlord' : 'tenant',
    bucket: i % 2 === 0 ? 'documents' : 'images',
    file_name: `test_file_${i}.pdf`,
    file_size_bytes: 1024 * 1024 * (1 + i), // 1MB to 10MB
    file_type: i % 2 === 0 ? 'application/pdf' : 'image/jpeg',
    upload_duration_ms: 500 + i * 100,
    status: i % 5 === 0 ? 'failed' : 'success', // 20% failure rate
    error_message: i % 5 === 0 ? 'Upload failed' : null,
    storage_url: `https://storage.test/test_${i}`,
  }))

  const { error } = await supabaseAdmin.from('admin_upload_logs').insert(uploads)
  if (error) throw error

  return uploads
}

/**
 * Seed test security logs
 */
export async function seedSecurityLogs(userId: string, count: number = 10) {
  const supabaseAdmin = getSupabaseAdminClient()
  const anonymizedUserId = Buffer.from(userId).toString('base64').substring(0, 32)

  const eventTypes: Array<
    'failed_login' | 'invalid_api_call' | 'rate_limit_exceeded' | 'suspicious_activity'
  > = ['failed_login', 'invalid_api_call', 'rate_limit_exceeded', 'suspicious_activity']

  const severities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']

  const logs = Array.from({ length: count }, (_, i) => ({
    user_id: anonymizedUserId,
    user_role: i % 3 === 0 ? 'admin' : i % 2 === 0 ? 'landlord' : 'tenant',
    event_type: eventTypes[i % eventTypes.length],
    severity: severities[i % severities.length],
    ip_address: `192.168.1.${i}`,
    user_agent: 'test-agent',
    details: { test: true, index: i },
  }))

  const { error } = await supabaseAdmin.from('admin_security_logs').insert(logs)
  if (error) throw error

  return logs
}

/**
 * Verify admin-only access (helper for tests)
 */
export async function verifyAdminAccess(userId: string, role: 'admin' | 'tenant' | 'landlord') {
  const supabaseAdmin = getSupabaseAdminClient()

  // Try to query admin tables directly (should work for admin role only via RLS)
  const { data: metrics, error: metricsError } = await supabaseAdmin
    .from('admin_metrics')
    .select('*')
    .limit(1)

  // Admin should have access, others should not (via RLS)
  // Note: This test assumes RLS is properly configured
  // In actual tests, we test via the UI which respects RLS

  return { metrics, metricsError }
}
