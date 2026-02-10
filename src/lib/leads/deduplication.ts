/**
 * Lead Deduplication Logic
 * 
 * Handles deduplication of leads based on email, phone, and unique IDs.
 */

import { supabase } from '@/lib/supabase/client'
import type { NormalizedLead } from './normalization'

export interface DeduplicationResult {
  isDuplicate: boolean
  existingLeadId?: string
  matchType?: 'email' | 'phone' | 'hash' | 'unique_id'
}

/**
 * Check if a lead is a duplicate
 */
export async function checkDuplicate(
  lead: NormalizedLead,
  uniqueId?: string
): Promise<DeduplicationResult> {
  // Check by dedupe hash (fastest)
  if (lead.dedupe_hash) {
    const { data: hashMatch } = await supabase
      .from('leads')
      .select('id')
      .eq('dedupe_hash', lead.dedupe_hash)
      .limit(1)
      .maybeSingle()

    if (hashMatch) {
      return {
        isDuplicate: true,
        existingLeadId: hashMatch.id,
        matchType: 'hash',
      }
    }
  }

  // Check by normalized email
  if (lead.normalized_email) {
    const { data: emailMatch } = await supabase
      .from('leads')
      .select('id')
      .eq('normalized_email', lead.normalized_email)
      .limit(1)
      .maybeSingle()

    if (emailMatch) {
      return {
        isDuplicate: true,
        existingLeadId: emailMatch.id,
        matchType: 'email',
      }
    }
  }

  // Check by normalized phone (if provided)
  if (lead.normalized_phone) {
    const { data: phoneMatch } = await supabase
      .from('leads')
      .select('id')
      .eq('normalized_phone', lead.normalized_phone)
      .limit(1)
      .maybeSingle()

    if (phoneMatch) {
      return {
        isDuplicate: true,
        existingLeadId: phoneMatch.id,
        matchType: 'phone',
      }
    }
  }

  // Check by unique ID (if provided)
  if (uniqueId) {
    const { data: idMatch } = await supabase
      .from('leads')
      .select('id')
      .eq('metadata->>unique_id', uniqueId)
      .limit(1)
      .maybeSingle()

    if (idMatch) {
      return {
        isDuplicate: true,
        existingLeadId: idMatch.id,
        matchType: 'unique_id',
      }
    }
  }

  return {
    isDuplicate: false,
  }
}

/**
 * Batch check for duplicates
 */
export async function checkDuplicatesBatch(
  leads: NormalizedLead[],
  _uniqueIds?: (string | undefined)[]
): Promise<Map<number, DeduplicationResult>> {
  const results = new Map<number, DeduplicationResult>()

  // Check all dedupe hashes at once
  const hashes = leads.map(l => l.dedupe_hash).filter(Boolean)
  if (hashes.length > 0) {
    const { data: hashMatches } = await supabase
      .from('leads')
      .select('id, dedupe_hash')
      .in('dedupe_hash', hashes)

    const hashMap = new Map(hashMatches?.map(m => [m.dedupe_hash, m.id]) || [])

    leads.forEach((lead, index) => {
      if (lead.dedupe_hash && hashMap.has(lead.dedupe_hash)) {
        results.set(index, {
          isDuplicate: true,
          existingLeadId: hashMap.get(lead.dedupe_hash),
          matchType: 'hash',
        })
      }
    })
  }

  // Check remaining by email
  const remainingIndices = leads
    .map((_, index) => index)
    .filter(index => !results.has(index))

  if (remainingIndices.length > 0) {
    const emailsToCheck = remainingIndices.map(index => leads[index].normalized_email).filter(Boolean)
    
    if (emailsToCheck.length > 0) {
      const { data: emailMatches } = await supabase
        .from('leads')
        .select('id, normalized_email')
        .in('normalized_email', emailsToCheck)

      const emailMap = new Map(emailMatches?.map(m => [m.normalized_email, m.id]) || [])

      remainingIndices.forEach(index => {
        const lead = leads[index]
        if (lead.normalized_email && emailMap.has(lead.normalized_email)) {
          results.set(index, {
            isDuplicate: true,
            existingLeadId: emailMap.get(lead.normalized_email),
            matchType: 'email',
          })
        } else {
          results.set(index, { isDuplicate: false })
        }
      })
    }
  }

  return results
}
