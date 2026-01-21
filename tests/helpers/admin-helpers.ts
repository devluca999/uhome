/**
 * Admin Test Helpers
 *
 * Utilities for testing admin functionality, including creating admin users,
 * performing admin actions, and verifying audit logs.
 */

import { getSupabaseAdminClient } from './db-helpers'
import { generateTestEmail, createAndConfirmUser } from './auth-helpers'
import { seedTestScenario } from './seed'
import type { AdminActionResult } from '@/hooks/admin/use-admin-user-actions'

export interface AdminUser {
  id: string
  email: string
  password: string
}

/**
 * Create an admin user for testing
 */
export async function createAdminUser(): Promise<AdminUser> {
  const email = generateTestEmail('admin')
  const password = 'TestAdminPassword123!'
  const { userId } = await createAndConfirmUser(email, password, { role: 'admin' })

  const supabaseAdmin = getSupabaseAdminClient()
  await supabaseAdmin.from('users').upsert({
    id: userId,
    email,
    role: 'admin',
  })

  return { id: userId, email, password }
}

/**
 * Perform an admin action via Edge Function (for testing)
 */
export async function performAdminAction(
  action: string,
  userId: string,
  adminId: string,
  reason?: string
): Promise<AdminActionResult> {
  const supabaseAdmin = getSupabaseAdminClient()

  // Get admin session token
  const {
    data: { session },
  } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'admin@test.com', // This won't work - need actual session
  })

  // For testing, directly call the Edge Function logic or use service role
  // This is a simplified version - in real tests, you'd use the actual client
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables for testing')
  }

  // Use fetch to call Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/admin-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      action,
      userId,
      reason,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return {
      success: false,
      action: action as any,
      userId,
      error: error.error || 'Failed to perform action',
    }
  }

  const data = await response.json()
  return {
    success: data.success || false,
    action: action as any,
    userId,
    auditLogId: data.auditLogId,
  }
}

/**
 * Verify audit log was created for an action
 */
export async function verifyAuditLog(
  action: string,
  targetUserId: string,
  adminId: string
): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdminClient()

  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .eq('action_type', action)
    .eq('target_user_id', targetUserId)
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error verifying audit log:', error)
    return false
  }

  return data !== null
}

/**
 * Seed mock audit logs for testing
 */
export async function seedAuditLogs(count: number = 10): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient()

  // Get admin and target users
  const { data: admins } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('role', 'admin')
    .limit(1)

  const { data: targets } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .neq('role', 'admin')
    .limit(count)

  if (!admins || admins.length === 0 || !targets || targets.length === 0) {
    console.warn('Not enough users to seed audit logs')
    return
  }

  const admin = admins[0]
  const actionTypes = ['ban', 'lock', 'reset_password', 'force_logout', 'suspend']

  const logs = targets.slice(0, count).map((target, index) => ({
    admin_id: admin.id,
    admin_email: admin.email,
    action_type: actionTypes[index % actionTypes.length],
    target_user_id: target.id,
    target_user_email: target.email,
    target_user_role: target.role,
    reason: `Test audit log ${index + 1}`,
    metadata: { test: true, index },
    ip_address: '192.168.1.1',
    user_agent: 'Test User Agent',
    created_at: new Date(Date.now() - index * 60000).toISOString(), // Stagger timestamps
  }))

  const { error } = await supabaseAdmin.from('admin_audit_logs').insert(logs)

  if (error) {
    console.error('Error seeding audit logs:', error)
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getAuditLogsForUser(userId: string) {
  const supabaseAdmin = getSupabaseAdminClient()

  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Verify admin action was successful in database
 */
export async function verifyUserStatus(
  userId: string,
  expectedStatus: 'active' | 'suspended' | 'banned' | 'locked',
  expectedIsLocked?: boolean
): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdminClient()

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('account_status, is_locked')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error verifying user status:', error)
    return false
  }

  if (!data) {
    return false
  }

  const statusMatch = data.account_status === expectedStatus
  const lockedMatch = expectedIsLocked !== undefined ? data.is_locked === expectedIsLocked : true

  return statusMatch && lockedMatch
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
 * Seed conversations for testing (uses seedTestScenario)
 */
export async function seedConversations(count: number = 15) {
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
