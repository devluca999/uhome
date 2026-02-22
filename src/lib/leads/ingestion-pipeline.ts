/**
 * Lead Ingestion Pipeline
 * 
 * Unified processing logic for both manual and automated lead ingestion.
 * Handles parsing, normalization, deduplication, validation, enrichment, and import.
 */

import { supabase } from '@/lib/supabase/client'
import { normalizeLead, type RawLead, type NormalizedLead } from './normalization'
import { checkDuplicatesBatch } from './deduplication'
import { checkOptIn, determineOptInStatus, type OptInStatus } from './opt-in'

export type { RawLead } from './normalization'

export interface IngestionOptions {
  source: string
  actorId: string
  environment?: 'staging' | 'production'
  sandboxMode?: boolean
  autoEnrollWaitlist?: boolean
  autoEnrollNewsletter?: boolean
  fieldMapping?: Record<string, string>
  updateExisting?: boolean // Update existing leads instead of skipping
}

export interface IngestionResult {
  success: boolean
  imported: number
  duplicates: number
  errors: number
  importEventId?: string
  errorsList?: Array<{ row: number; error: string }>
}

export interface ProcessedLead extends NormalizedLead {
  source: string
  uploaded_by: string
  opt_in_status: OptInStatus
  metadata?: Record<string, any>
}

/**
 * Main ingestion pipeline
 */
export async function ingestLeads(
  rawLeads: RawLead[],
  options: IngestionOptions
): Promise<IngestionResult> {
  const result: IngestionResult = {
    success: false,
    imported: 0,
    duplicates: 0,
    errors: 0,
    errorsList: [],
  }

  try {
    // Step 1: Parse and normalize
    const normalizedLeads: NormalizedLead[] = []
    const parseErrors: Array<{ row: number; error: string }> = []

    rawLeads.forEach((raw, index) => {
      try {
        // Validate required fields
        if (!raw.email || !raw.email.trim()) {
          parseErrors.push({ row: index + 1, error: 'Missing required field: email' })
          return
        }

        // Apply field mapping if provided
        const mappedRaw = options.fieldMapping
          ? applyFieldMapping(raw, options.fieldMapping)
          : raw

        const normalized = normalizeLead(mappedRaw)
        normalizedLeads.push(normalized)
      } catch (error) {
        parseErrors.push({
          row: index + 1,
          error: error instanceof Error ? error.message : 'Parse error',
        })
      }
    })

    if (normalizedLeads.length === 0) {
      result.errors = parseErrors.length
      result.errorsList = parseErrors
      return result
    }

    // Step 2: Deduplicate
    const dedupeResults = await checkDuplicatesBatch(normalizedLeads)
    const uniqueLeads: NormalizedLead[] = []
    const duplicateIndices: number[] = []

    normalizedLeads.forEach((lead, index) => {
      const dedupeResult = dedupeResults.get(index)
      if (dedupeResult?.isDuplicate && !options.updateExisting) {
        duplicateIndices.push(index)
      } else {
        uniqueLeads.push(lead)
      }
    })

    result.duplicates = duplicateIndices.length

    // Step 3: Validate and check opt-in
    const validatedLeads: ProcessedLead[] = []
    const validationErrors: Array<{ row: number; error: string }> = []

    for (let i = 0; i < uniqueLeads.length; i++) {
      const lead = uniqueLeads[i]
      const originalIndex = normalizedLeads.indexOf(lead)

      try {
        // Validate email format
        if (!isValidEmail(lead.email)) {
          validationErrors.push({ row: originalIndex + 1, error: 'Invalid email format' })
          continue
        }

        // Check opt-in
        const optInCheck = await checkOptIn(lead.normalized_email)
        const optInStatus = determineOptInStatus(
          options.autoEnrollNewsletter,
          optInCheck.status
        )

        if (!optInCheck.canEnroll && options.autoEnrollNewsletter) {
          validationErrors.push({
            row: originalIndex + 1,
            error: 'Cannot enroll: user has opted out',
          })
          continue
        }

        // Enrich with metadata
        const processedLead: ProcessedLead = {
          ...lead,
          source: options.source,
          uploaded_by: options.actorId,
          opt_in_status: optInStatus,
          metadata: {
            imported_at: new Date().toISOString(),
            environment: options.environment || 'production',
            sandbox_mode: options.sandboxMode || false,
          },
        }

        validatedLeads.push(processedLead)
      } catch (error) {
        validationErrors.push({
          row: originalIndex + 1,
          error: error instanceof Error ? error.message : 'Validation error',
        })
      }
    }

    result.errors = parseErrors.length + validationErrors.length
    result.errorsList = [...parseErrors, ...validationErrors]

    // Step 4: Create import event
    const { data: importEvent, error: eventError } = await supabase
      .from('lead_import_events')
      .insert({
        source: options.source,
        rows_processed: rawLeads.length,
        rows_imported: 0, // Will update after import
        rows_duplicates: result.duplicates,
        rows_errors: result.errors,
        actor: options.actorId,
        environment: options.environment || 'production',
        sandbox_mode: options.sandboxMode || false,
        field_mapping: options.fieldMapping || null,
        import_settings: {
          auto_enroll_waitlist: options.autoEnrollWaitlist || false,
          auto_enroll_newsletter: options.autoEnrollNewsletter || false,
        },
        error_log: result.errorsList.length > 0 ? result.errorsList : null,
      })
      .select()
      .single()

    if (eventError) {
      throw new Error(`Failed to create import event: ${eventError.message}`)
    }

    result.importEventId = importEvent.id

    // Step 5: Import leads (with transaction safety)
    if (validatedLeads.length > 0) {
      const leadsToInsert = validatedLeads.map(lead => ({
        email: lead.email,
        normalized_email: lead.normalized_email,
        name: lead.name,
        phone: lead.phone,
        normalized_phone: lead.normalized_phone,
        company: lead.company,
        icp_tags: lead.icp_tags,
        dedupe_hash: lead.dedupe_hash,
        source: lead.source,
        uploaded_by: lead.uploaded_by,
        opt_in_status: lead.opt_in_status,
        metadata: lead.metadata,
        import_event_id: importEvent.id,
        status: 'new',
      }))

      const { error: insertError } = await supabase.from('leads').insert(leadsToInsert)

      if (insertError) {
        throw new Error(`Failed to import leads: ${insertError.message}`)
      }

      result.imported = validatedLeads.length

      // Step 6: Auto-enroll to waitlist/newsletter (if enabled)
      if (options.autoEnrollWaitlist || options.autoEnrollNewsletter) {
        await enrollLeads(
          validatedLeads.map(l => l.normalized_email),
          {
            waitlist: options.autoEnrollWaitlist || false,
            newsletter: options.autoEnrollNewsletter || false,
          }
        )
      }

      // Update import event with final counts
      await supabase
        .from('lead_import_events')
        .update({
          rows_imported: result.imported,
          completed_at: new Date().toISOString(),
        })
        .eq('id', importEvent.id)
    }

    result.success = true
    return result
  } catch (error) {
    console.error('Error in ingestion pipeline:', error)
    result.success = false
    result.errorsList?.push({
      row: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return result
  }
}

/**
 * Apply field mapping to raw lead data
 */
function applyFieldMapping(raw: RawLead, mapping: Record<string, string>): RawLead {
  const mapped: RawLead = { ...raw }

  Object.entries(mapping).forEach(([targetField, sourceField]) => {
    if (sourceField in raw) {
      mapped[targetField] = raw[sourceField]
    }
  })

  return mapped
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Enroll leads to waitlist/newsletter
 */
async function enrollLeads(
  emails: string[],
  options: { waitlist: boolean; newsletter: boolean }
): Promise<void> {
  // This would integrate with waitlist and newsletter systems
  // For now, it's a placeholder
  console.log('Enrolling leads:', { emails: emails.length, options })
  // Deferred: Implement waitlist/newsletter enrollment (ticket)
}
