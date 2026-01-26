// Seed Admin Performance Data
// Creates sample data for testing the admin performance dashboard
// Run with: npm run tsx scripts/seed-admin-performance-data.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedAdminPerformanceData() {
  console.log('🌱 Seeding admin performance data...\n')

  // Generate sample performance metrics
  const metrics = []
  const now = new Date()

  // Page load metrics (last 7 days)
  const pages = ['/tenant/dashboard', '/landlord/messages', '/admin/overview', '/tenant/messages']
  for (let i = 0; i < 100; i++) {
    const daysAgo = Math.floor(Math.random() * 7)
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    metrics.push({
      user_id: `user_${Math.floor(Math.random() * 10) + 1}`,
      user_role: ['tenant', 'landlord', 'admin'][Math.floor(Math.random() * 3)],
      metric_type: 'page_load',
      page_path: pages[Math.floor(Math.random() * pages.length)],
      metric_name: `page_load_${pages[Math.floor(Math.random() * pages.length)].replace(/\//g, '_')}`,
      duration_ms: Math.floor(Math.random() * 3000) + 500, // 500-3500ms
      created_at: createdAt.toISOString(),
    })
  }

  // API call metrics
  const apiEndpoints = ['leases', 'messages', 'properties', 'users', 'documents']
  for (let i = 0; i < 200; i++) {
    const hoursAgo = Math.floor(Math.random() * 24)
    const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

    metrics.push({
      user_id: `user_${Math.floor(Math.random() * 10) + 1}`,
      user_role: ['tenant', 'landlord', 'admin'][Math.floor(Math.random() * 3)],
      metric_type: 'api_call',
      page_path: pages[Math.floor(Math.random() * pages.length)],
      metric_name: `api_${apiEndpoints[Math.floor(Math.random() * apiEndpoints.length)]}`,
      duration_ms: Math.floor(Math.random() * 1000) + 100, // 100-1100ms
      created_at: createdAt.toISOString(),
    })
  }

  // Insert metrics
  const { error: metricsError } = await supabase.from('admin_metrics').insert(metrics)
  if (metricsError) {
    console.error('❌ Error inserting metrics:', metricsError)
  } else {
    console.log(`✅ Inserted ${metrics.length} performance metrics`)
  }

  // Generate upload logs
  const uploadLogs = []
  const fileTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain']
  const statuses = ['success', 'failed']

  for (let i = 0; i < 50; i++) {
    const hoursAgo = Math.floor(Math.random() * 24)
    const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    const status = statuses[Math.random() > 0.9 ? 1 : 0] // 90% success rate

    uploadLogs.push({
      user_id: `user_${Math.floor(Math.random() * 10) + 1}`,
      user_role: ['tenant', 'landlord'][Math.floor(Math.random() * 2)], // No admin uploads
      bucket: 'documents',
      file_name: `document_${i + 1}.${fileTypes[Math.floor(Math.random() * fileTypes.length)].split('/')[1]}`,
      file_size_bytes: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
      file_type: fileTypes[Math.floor(Math.random() * fileTypes.length)],
      status,
      error_message: status === 'failed' ? 'Upload timeout' : null,
      upload_duration_ms: Math.floor(Math.random() * 5000) + 500,
      created_at: createdAt.toISOString(),
    })
  }

  const { error: uploadError } = await supabase.from('admin_upload_logs').insert(uploadLogs)
  if (uploadError) {
    console.error('❌ Error inserting upload logs:', uploadError)
  } else {
    console.log(`✅ Inserted ${uploadLogs.length} upload logs`)
  }

  // Generate security logs
  const securityLogs = []
  const eventTypes = ['failed_login', 'invalid_api_call', 'rate_limit_exceeded', 'suspicious_activity']
  const severities = ['low', 'medium', 'high']

  for (let i = 0; i < 20; i++) {
    const hoursAgo = Math.floor(Math.random() * 24)
    const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    const severity = severities[Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : 2) : 0] // Mostly low severity

    securityLogs.push({
      user_id: Math.random() > 0.5 ? `user_${Math.floor(Math.random() * 10) + 1}` : null,
      user_role: Math.random() > 0.5 ? ['tenant', 'landlord', 'admin'][Math.floor(Math.random() * 3)] : null,
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      severity,
      details: {
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Test User Agent',
        endpoint: Math.random() > 0.5 ? `/api/${apiEndpoints[Math.floor(Math.random() * apiEndpoints.length)]}` : null,
      },
      created_at: createdAt.toISOString(),
    })
  }

  const { error: securityError } = await supabase.from('admin_security_logs').insert(securityLogs)
  if (securityError) {
    console.error('❌ Error inserting security logs:', securityError)
  } else {
    console.log(`✅ Inserted ${securityLogs.length} security logs`)
  }

  console.log('\n🎉 Admin performance data seeding complete!')
  console.log('📊 Check the admin performance dashboard to see the real data.')
}

// Run the seeding
seedAdminPerformanceData().catch(console.error)