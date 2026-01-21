// Supabase Edge Function for Fetching Admin Audit Logs
// Returns paginated audit logs with filtering capabilities (by admin, by user, by action type, time range)
// Admin-only access with JWT validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypasses RLS for queries)
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
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (adminCheckError || !adminData || adminData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse query parameters for filtering
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 100) // Max 100 per page
    const adminId = url.searchParams.get('adminId') || null
    const targetUserId = url.searchParams.get('targetUserId') || null
    const actionType = url.searchParams.get('actionType') || null
    const startDate = url.searchParams.get('startDate') || null
    const endDate = url.searchParams.get('endDate') || null
    const searchEmail = url.searchParams.get('searchEmail') || null

    // Build query with filters
    let auditQuery = supabaseClient.from('admin_audit_logs').select('*', { count: 'exact' })

    // Apply filters
    if (adminId) {
      auditQuery = auditQuery.eq('admin_id', adminId)
    }

    if (targetUserId) {
      auditQuery = auditQuery.eq('target_user_id', targetUserId)
    }

    if (actionType) {
      auditQuery = auditQuery.eq('action_type', actionType)
    }

    if (startDate) {
      auditQuery = auditQuery.gte('created_at', startDate)
    }

    if (endDate) {
      auditQuery = auditQuery.lte('created_at', endDate)
    }

    if (searchEmail) {
      // Search in both admin_email and target_user_email
      auditQuery = auditQuery.or(
        `admin_email.ilike.%${searchEmail}%,target_user_email.ilike.%${searchEmail}%`
      )
    }

    // Order by created_at descending (newest first)
    auditQuery = auditQuery.order('created_at', { ascending: false })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    auditQuery = auditQuery.range(from, to)

    // Execute query
    const { data, error, count } = await auditQuery

    if (error) {
      console.error('Error fetching audit logs:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch audit logs', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / pageSize) : 0

    // Return paginated results
    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in fetch-audit-logs function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
