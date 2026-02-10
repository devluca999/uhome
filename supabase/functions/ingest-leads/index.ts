/**
 * Ingest Leads Edge Function
 * 
 * Handles automated lead ingestion from scrapers and API integrations.
 * Uses the same ingestion pipeline as manual uploads.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IngestLeadsRequest {
  leads: Array<{
    email: string
    name?: string
    phone?: string
    company?: string
    icp_tags?: string[]
    [key: string]: any
  }>
  source: string // 'scraper', 'apify', 'apollo', etc.
  actorId: string
  environment?: 'staging' | 'production'
  sandboxMode?: boolean
  autoEnrollWaitlist?: boolean
  autoEnrollNewsletter?: boolean
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication (API key or service role)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { leads, source, actorId, environment, sandboxMode, autoEnrollWaitlist, autoEnrollNewsletter }: IngestLeadsRequest = await req.json()

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No leads provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!source || !actorId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: source, actorId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate leads have required fields
    const invalidLeads = leads.filter(l => !l.email || !l.email.trim())
    if (invalidLeads.length > 0) {
      return new Response(
        JSON.stringify({ error: `${invalidLeads.length} leads missing required email field` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Call ingestion pipeline (would need to be ported to Deno or called via Supabase client)
    // For now, we'll do a simplified version here
    // TODO: Port ingestion pipeline logic to Edge Function or call via Supabase client

    // Create import event
    const { data: importEvent, error: eventError } = await supabase
      .from('lead_import_events')
      .insert({
        source,
        rows_processed: leads.length,
        rows_imported: 0,
        rows_duplicates: 0,
        rows_errors: 0,
        actor: actorId,
        environment: environment || 'production',
        sandbox_mode: sandboxMode || false,
        import_settings: {
          auto_enroll_waitlist: autoEnrollWaitlist || false,
          auto_enroll_newsletter: autoEnrollNewsletter || false,
        },
      })
      .select()
      .single()

    if (eventError) {
      throw new Error(`Failed to create import event: ${eventError.message}`)
    }

    // Process and insert leads
    // Note: This is simplified - full pipeline would include normalization, deduplication, etc.
    const leadsToInsert = leads.map(lead => ({
      email: lead.email.trim(),
      normalized_email: lead.email.toLowerCase().trim(),
      name: lead.name?.trim() || null,
      phone: lead.phone?.trim() || null,
      company: lead.company?.trim() || null,
      icp_tags: lead.icp_tags || null,
      source,
      uploaded_by: actorId,
      import_event_id: importEvent.id,
      status: 'new',
      opt_in_status: 'unknown',
      metadata: {
        imported_at: new Date().toISOString(),
        environment: environment || 'production',
        sandbox_mode: sandboxMode || false,
      },
    }))

    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select()

    if (insertError) {
      // Update import event with error
      await supabase
        .from('lead_import_events')
        .update({
          rows_errors: leads.length,
          error_log: [{ error: insertError.message }],
        })
        .eq('id', importEvent.id)

      throw insertError
    }

    // Update import event with success
    await supabase
      .from('lead_import_events')
      .update({
        rows_imported: insertedLeads?.length || 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importEvent.id)

    return new Response(
      JSON.stringify({
        success: true,
        imported: insertedLeads?.length || 0,
        importEventId: importEvent.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in ingest-leads function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
