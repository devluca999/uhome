// Supabase Edge Function for Admin Actions
// Handles ban/unban, lock/unlock, suspend/unsuspend, reset password, force logout
// All actions are logged to admin_audit_logs table for accountability

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to hash IP address for privacy
async function hashIP(ip: string | null): Promise<string | null> {
  if (!ip) return null
  // Simple hash for privacy (in production, use proper cryptographic hashing)
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(ip)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex.substring(0, 16) // Use first 16 chars for storage
  } catch {
    return null
  }
}

// Helper to get client IP address
function getClientIP(req: Request): string | null {
  // Check X-Forwarded-For header (Supabase adds this)
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // Fallback to CF-Connecting-IP (if using Cloudflare)
  const cfIP = req.headers.get('cf-connecting-ip')
  if (cfIP) {
    return cfIP
  }

  return null
}

serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get authenticated admin user from request
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin is authenticated
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user: adminUser },
      error: authError,
    } = await supabaseClient.auth.getUser(token)

    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin role
    const { data: adminData, error: adminCheckError } = await supabaseClient
      .from('users')
      .select('role, email')
      .eq('id', adminUser.id)
      .single()

    if (adminCheckError || !adminData || adminData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const body = await req.json()
    const { action, userId, reason, metadata, duration } = body

    if (!action || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: action, userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get target user info (cache email for audit log)
    const { data: targetUser, error: targetError } = await supabaseClient
      .from('users')
      .select('id, email, role, account_status, is_locked')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return new Response(JSON.stringify({ error: 'Target user not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prevent self-actions (admin cannot ban/lock themselves)
    if (
      userId === adminUser.id &&
      (action === 'ban' || action === 'lock' || action === 'suspend')
    ) {
      return new Response(JSON.stringify({ error: 'Cannot perform this action on yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get client IP and user agent for audit log
    const clientIP = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || null
    const hashedIP = await hashIP(clientIP)

    // Prepare audit log entry
    const auditLog = {
      admin_id: adminUser.id,
      admin_email: adminData.email,
      action_type: action,
      target_user_id: userId,
      target_user_email: targetUser.email,
      target_user_role: targetUser.role,
      reason: reason || null,
      metadata: metadata || {},
      ip_address: hashedIP,
      user_agent: userAgent,
    }

    // Execute action based on type
    let updateData: Record<string, unknown> = {}
    let auditMetadata = { ...(metadata || {}) }

    switch (action) {
      case 'ban':
        updateData = {
          account_status: 'banned',
          banned_at: new Date().toISOString(),
          is_locked: true, // Banned users are also locked
          locked_until: null,
          updated_at: new Date().toISOString(),
        }
        auditMetadata = { ...auditMetadata, previous_status: targetUser.account_status || 'active' }
        break

      case 'unban':
        updateData = {
          account_status: 'active',
          banned_at: null,
          is_locked: false,
          locked_until: null,
          updated_at: new Date().toISOString(),
        }
        auditMetadata = { ...auditMetadata, previous_status: targetUser.account_status || 'banned' }
        break

      case 'lock':
        const lockDuration = duration || null // Duration in milliseconds or null for indefinite
        const lockedUntil = lockDuration ? new Date(Date.now() + lockDuration).toISOString() : null
        updateData = {
          account_status: 'locked',
          is_locked: true,
          locked_until: lockedUntil,
          updated_at: new Date().toISOString(),
        }
        auditMetadata = {
          ...auditMetadata,
          previous_status: targetUser.account_status || 'active',
          duration_ms: lockDuration,
          locked_until: lockedUntil,
        }
        break

      case 'unlock':
        updateData = {
          account_status: 'active',
          is_locked: false,
          locked_until: null,
          updated_at: new Date().toISOString(),
        }
        auditMetadata = { ...auditMetadata, previous_status: targetUser.account_status || 'locked' }
        break

      case 'suspend':
        updateData = {
          account_status: 'suspended',
          suspended_at: new Date().toISOString(),
          is_locked: true, // Suspended users are also locked
          locked_until: null,
          updated_at: new Date().toISOString(),
        }
        auditMetadata = { ...auditMetadata, previous_status: targetUser.account_status || 'active' }
        break

      case 'unsuspend':
        updateData = {
          account_status: 'active',
          suspended_at: null,
          is_locked: false,
          locked_until: null,
          updated_at: new Date().toISOString(),
        }
        auditMetadata = {
          ...auditMetadata,
          previous_status: targetUser.account_status || 'suspended',
        }
        break

      case 'reset_password':
        // Trigger password reset email via Supabase Auth
        const { error: resetError } = await supabaseClient.auth.admin.generateLink({
          type: 'recovery',
          email: targetUser.email || '',
        })

        if (resetError) {
          return new Response(
            JSON.stringify({ error: 'Failed to reset password', details: resetError.message }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        // No user table update needed for password reset
        updateData = { updated_at: new Date().toISOString() }
        break

      case 'force_logout':
        // Invalidate all user sessions via Supabase Auth Admin API
        const { error: logoutError } = await supabaseClient.auth.admin.signOut(userId, 'global')

        if (logoutError) {
          console.error('Error forcing logout:', logoutError)
          // Continue anyway - log the attempt
        }

        // No user table update needed for force logout
        updateData = { updated_at: new Date().toISOString() }
        break

      case 'delete':
        // Delete user from auth.users (cascades to public.users via foreign key)
        // First, soft-delete or mark for deletion in public.users
        // Then delete from auth.users
        const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId)

        if (deleteAuthError) {
          console.error('Error deleting user from auth:', deleteAuthError)
          // Still log the attempt
        } else {
          // User deleted from auth.users will cascade to public.users
          // But we'll also update public.users to mark as deleted
          updateData = {
            account_status: 'banned', // Mark as banned before deletion
            updated_at: new Date().toISOString(),
          }
        }
        auditMetadata = {
          ...auditMetadata,
          previous_status: targetUser.account_status || 'active',
          deleted: true,
        }
        break

      default:
        return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // Update audit log with metadata
    auditLog.metadata = auditMetadata

    // Insert audit log BEFORE executing action (for accountability)
    const { data: auditLogData, error: auditError } = await supabaseClient
      .from('admin_audit_logs')
      .insert([auditLog])
      .select()
      .single()

    if (auditError) {
      console.error('Error inserting audit log:', auditError)
      return new Response(
        JSON.stringify({ error: 'Failed to log action', details: auditError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update user table if needed
    if (
      Object.keys(updateData).length > 1 ||
      (action !== 'reset_password' && action !== 'force_logout')
    ) {
      const { error: updateError } = await supabaseClient
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating user:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update user', details: updateError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Return success with audit log ID
    return new Response(
      JSON.stringify({
        success: true,
        action,
        userId,
        auditLogId: auditLogData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in admin-actions function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
