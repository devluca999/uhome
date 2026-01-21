/**
 * Admin Test Helpers
 *
 * Comprehensive test utilities for admin functionality testing:
 * - Admin user creation
 * - Test data seeding (audit logs, security logs, tickets, conversations, announcements)
 * - Status verification
 * - Audit log verification
 */

import { getSupabaseAdminClient } from './db-helpers'
import { generateTestEmail, createAndConfirmUser } from './auth-helpers'
import { seedTestScenario } from './seed'
import { seedTestScenario } from './seed'

/**
 * Seed admin test scenario with admin user and test users with varying statuses
 */
export async function seedAdminTestScenario() {
  const supabaseAdmin = getSupabaseAdminClient()

  // Create admin user
  const adminEmail = generateTestEmail('admin')
  const password = 'TestPassword123!'
  const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
  await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

  // Create test users with varying statuses
  const users = []

  // Active landlord
  const activeLandlordEmail = generateTestEmail('landlord-active')
  const { userId: activeLandlordId } = await createAndConfirmUser(activeLandlordEmail, password, {
    role: 'landlord',
  })
  await supabaseAdmin
    .from('users')
    .upsert({
      id: activeLandlordId,
      email: activeLandlordEmail,
      role: 'landlord',
      account_status: 'active',
    })
  users.push({
    email: activeLandlordEmail,
    userId: activeLandlordId,
    role: 'landlord',
    status: 'active',
  })

  // Suspended landlord
  const suspendedLandlordEmail = generateTestEmail('landlord-suspended')
  const { userId: suspendedLandlordId } = await createAndConfirmUser(
    suspendedLandlordEmail,
    password,
    { role: 'landlord' }
  )
  await supabaseAdmin
    .from('users')
    .upsert({
      id: suspendedLandlordId,
      email: suspendedLandlordEmail,
      role: 'landlord',
      account_status: 'suspended',
      suspended_at: new Date().toISOString(),
    })
  users.push({
    email: suspendedLandlordEmail,
    userId: suspendedLandlordId,
    role: 'landlord',
    status: 'suspended',
  })

  // Banned tenant
  const bannedTenantEmail = generateTestEmail('tenant-banned')
  const { userId: bannedTenantId } = await createAndConfirmUser(bannedTenantEmail, password, {
    role: 'tenant',
  })
  await supabaseAdmin
    .from('users')
    .upsert({
      id: bannedTenantId,
      email: bannedTenantEmail,
      role: 'tenant',
      account_status: 'banned',
      banned_at: new Date().toISOString(),
      is_locked: true,
    })
  users.push({ email: bannedTenantEmail, userId: bannedTenantId, role: 'tenant', status: 'banned' })

  // Locked tenant
  const lockedTenantEmail = generateTestEmail('tenant-locked')
  const { userId: lockedTenantId } = await createAndConfirmUser(lockedTenantEmail, password, {
    role: 'tenant',
  })
  await supabaseAdmin
    .from('users')
    .upsert({
      id: lockedTenantId,
      email: lockedTenantEmail,
      role: 'tenant',
      account_status: 'locked',
      is_locked: true,
      locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  users.push({ email: lockedTenantEmail, userId: lockedTenantId, role: 'tenant', status: 'locked' })

  // Additional active tenants
  for (let i = 0; i < 5; i++) {
    const email = generateTestEmail(`tenant-active${i}`)
    const { userId } = await createAndConfirmUser(email, password, { role: 'tenant' })
    await supabaseAdmin
      .from('users')
      .upsert({ id: userId, email, role: 'tenant', account_status: 'active' })
    users.push({ email, userId, role: 'tenant', status: 'active' })
  }

  return {
    admin: { email: adminEmail, password, userId: adminId },
    users,
  }
}

/**
 * Seed audit logs for testing
 */
export async function seedAuditLogs(
  count: number = 10,
  adminId?: string,
  targetUserIds?: string[]
) {
  const supabaseAdmin = getSupabaseAdminClient()

  // Get admin if not provided
  if (!adminId) {
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .limit(1)

    if (!admins || admins.length === 0) {
      throw new Error('No admin user found for seeding audit logs')
    }
    adminId = admins[0].id
  }

  // Get target users if not provided
  if (!targetUserIds || targetUserIds.length === 0) {
    const { data: targets } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .neq('role', 'admin')
      .limit(count)

    if (!targets || targets.length === 0) {
      throw new Error('No target users found for seeding audit logs')
    }
    targetUserIds = targets.map(t => t.id)
  }

  const { data: adminData } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', adminId)
    .single()

  const actionTypes = [
    'ban',
    'unban',
    'lock',
    'unlock',
    'suspend',
    'unsuspend',
    'reset_password',
    'force_logout',
    'delete',
  ]

  const logs = []
  for (let i = 0; i < count; i++) {
    const targetUserIndex = i % targetUserIds.length
    const targetUserId = targetUserIds[targetUserIndex]

    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('email, role')
      .eq('id', targetUserId)
      .single()

    logs.push({
      admin_id: adminId,
      admin_email: adminData?.email || 'admin@test.com',
      action_type: actionTypes[i % actionTypes.length],
      target_user_id: targetUserId,
      target_user_email: targetUser?.email || 'target@test.com',
      target_user_role: targetUser?.role || 'tenant',
      reason: `Test audit log ${i + 1}`,
      metadata: { test: true, index: i },
      ip_address: '192.168.1.1',
      user_agent: 'Test User Agent',
      created_at: new Date(Date.now() - i * 60000).toISOString(), // Stagger timestamps
    })
  }

  const { error } = await supabaseAdmin.from('admin_audit_logs').insert(logs)

  if (error) {
    throw error
  }

  return logs
}

/**
 * Seed security logs for testing
 */
export async function seedSecurityLogs(count: number = 10) {
  const supabaseAdmin = getSupabaseAdminClient()

  // Get some test users
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .neq('role', 'admin')
    .limit(count)

  if (!users || users.length === 0) {
    throw new Error('No users found for seeding security logs')
  }

  const eventTypes = [
    'failed_login',
    'invalid_api_call',
    'rate_limit_exceeded',
    'suspicious_activity',
  ]
  const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']

  const logs = []
  for (let i = 0; i < count; i++) {
    const user = users[i % users.length]
    logs.push({
      user_id: user.id,
      user_role: user.role,
      event_type: eventTypes[i % eventTypes.length],
      severity: severities[i % severities.length],
      ip_address: '192.168.1.1',
      user_agent: 'Test User Agent',
      details: { test: true, index: i },
      created_at: new Date(Date.now() - i * 60000).toISOString(),
    })
  }

  const { error } = await supabaseAdmin.from('admin_security_logs').insert(logs)

  if (error) {
    throw error
  }

  return logs
}

/**
 * Seed performance metrics for testing
 */
export async function seedPerformanceMetrics(count: number = 20) {
  const supabaseAdmin = getSupabaseAdminClient()

  // Get some test users
  const { data: users } = await supabaseAdmin.from('users').select('id, role').limit(count)

  if (!users || users.length === 0) {
    throw new Error('No users found for seeding performance metrics')
  }

  const metricTypes = ['page_load', 'api_call', 'component_render']
  const pages = ['/dashboard', '/finances', '/properties', '/messages', '/settings']

  const metrics = []
  for (let i = 0; i < count; i++) {
    const user = users[i % users.length]
    const metricType = metricTypes[i % metricTypes.length]

    const metric: any = {
      user_id: user.id,
      user_role: user.role,
      metric_type: metricType,
      metric_name: `test_${metricType}_${i}`,
      duration_ms: Math.floor(Math.random() * 3000) + 100, // 100-3100ms
      created_at: new Date(Date.now() - i * 30000).toISOString(),
    }

    if (metricType === 'page_load') {
      metric.page_path = pages[i % pages.length]
    }

    metrics.push(metric)
  }

  const { error } = await supabaseAdmin.from('admin_metrics').insert(metrics)

  if (error) {
    throw error
  }

  return metrics
}

/**
 * Seed support tickets for testing
 */
export async function seedSupportTickets(count: number = 10) {
  const supabaseAdmin = getSupabaseAdminClient()

  // Get some test users
  const { data: users } = await supabaseAdmin.from('users').select('id, email').limit(count)

  if (!users || users.length === 0) {
    throw new Error('No users found for seeding support tickets')
  }

  const statuses: ('open' | 'resolved')[] = ['open', 'resolved']
  const subjects = [
    'Login Issue',
    'Payment Problem',
    'Feature Request',
    'Bug Report',
    'Account Question',
  ]
  const messages = [
    'I cannot log into my account',
    'My payment was not processed',
    'Can you add a new feature?',
    'I found a bug in the system',
    'I have a question about my account',
  ]

  const tickets = []
  for (let i = 0; i < count; i++) {
    const user = users[i % users.length]
    const status = statuses[i % statuses.length]

    const ticket: any = {
      user_id: user.id,
      email: user.email || 'user@test.com',
      subject: `${subjects[i % subjects.length]} ${i + 1}`,
      message: messages[i % messages.length],
      status,
      created_at: new Date(Date.now() - i * 60000).toISOString(),
    }

    if (status === 'resolved') {
      ticket.resolved_at = new Date(Date.now() - i * 30000).toISOString()
      // Get an admin user for resolved_by
      const { data: admin } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single()
      if (admin) {
        ticket.resolved_by = admin.id
      }
    }

    tickets.push(ticket)
  }

  const { error } = await supabaseAdmin.from('support_tickets').insert(tickets)

  if (error) {
    throw error
  }

  return tickets
}

/**
 * Seed conversations for testing (tenant-landlord messages)
 */
export async function seedConversations(count: number = 15) {
  const supabaseAdmin = getSupabaseAdminClient()

  // Use seedTestScenario to create proper lease structure
  const scenarios = []
  for (let i = 0; i < Math.min(count, 5); i++) {
    const scenario = await seedTestScenario({ createMessages: true })
    scenarios.push(scenario)
  }

  return scenarios
}

/**
 * Seed platform announcements for testing
 */
export async function seedAnnouncements(count: number = 5) {
  const supabaseAdmin = getSupabaseAdminClient()

  // Get admin user
  const { data: admin } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (!admin) {
    throw new Error('No admin user found for seeding announcements')
  }

  // Get all leases (for sending announcements)
  const { data: leases } = await supabaseAdmin.from('leases').select('id').limit(10)

  if (!leases || leases.length === 0) {
    throw new Error('No leases found for seeding announcements')
  }

  const announcements = []
  const subjects = [
    'Platform Update',
    'New Feature',
    'Maintenance Notice',
    'Welcome Message',
    'Important Announcement',
  ]
  const bodies = [
    'We have released a new update with improved features',
    'Check out our new feature that makes your life easier',
    'Scheduled maintenance will occur this weekend',
    'Welcome to our platform!',
    'Please read this important announcement',
  ]

  for (let i = 0; i < count; i++) {
    // Create system message for each lease (simulating announcement)
    for (const lease of leases.slice(0, Math.min(3, leases.length))) {
      const { error } = await supabaseAdmin.from('messages').insert({
        lease_id: lease.id,
        sender_id: null, // System message
        sender_role: 'system',
        body: bodies[i % bodies.length],
        intent: 'notice',
        status: 'open',
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
      })

      if (!error) {
        announcements.push({
          lease_id: lease.id,
          subject: subjects[i % subjects.length],
          body: bodies[i % bodies.length],
        })
      }
    }
  }

  return announcements
}

/**
 * Wait for audit log to appear
 */
export async function waitForAuditLog(
  action: string,
  targetUserId: string,
  adminId: string,
  timeout: number = 10000
): Promise<any> {
  const supabaseAdmin = getSupabaseAdminClient()
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const { data, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .eq('action_type', action)
      .eq('target_user_id', targetUserId)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      return data
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error(`Audit log not found within ${timeout}ms`)
}

// Re-export existing functions from admin-helpers.ts
export {
  verifyUserStatus,
  verifyAuditLog,
  getAuditLogsForUser,
  createAdminUser,
} from './admin-helpers'
