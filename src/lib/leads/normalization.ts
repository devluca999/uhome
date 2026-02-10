/**
 * Lead Data Normalization
 * 
 * Normalizes lead data fields for consistent storage and deduplication.
 */

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // If empty after cleaning, return null
  if (!digits) return null

  // If starts with 1 (US country code), keep it
  // Otherwise, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  } else if (digits.startsWith('+')) {
    // Already has country code
    return `+${digits.replace(/\D/g, '')}`
  }

  // Default: assume US and add +1
  return `+1${digits.slice(-10)}`
}

/**
 * Normalize name (title case)
 */
export function normalizeName(name: string | null | undefined): string | null {
  if (!name) return null

  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Normalize company name (title case)
 */
export function normalizeCompany(company: string | null | undefined): string | null {
  if (!company) return null

  return company.trim()
}

/**
 * Normalize ICP tags
 */
export function normalizeIcpTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return []

  const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())
  
  return tagArray
    .map(tag => tag.toLowerCase().trim())
    .filter(tag => tag.length > 0)
}

/**
 * Generate deduplication hash
 */
export function generateDedupeHash(email: string, phone: string | null): string {
  const normalizedEmail = normalizeEmail(email)
  const normalizedPhone = phone ? normalizePhone(phone) : ''
  const combined = `${normalizedEmail}|${normalizedPhone || ''}`
  
  // Simple hash (in production, use crypto.subtle.digest for better hashing)
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Normalize entire lead object
 */
export interface RawLead {
  email: string
  name?: string | null
  phone?: string | null
  company?: string | null
  icp_tags?: string | string[] | null
  [key: string]: any // Allow additional fields
}

export interface NormalizedLead {
  email: string
  normalized_email: string
  name: string | null
  phone: string | null
  normalized_phone: string | null
  company: string | null
  icp_tags: string[]
  dedupe_hash: string
}

export function normalizeLead(raw: RawLead): NormalizedLead {
  const normalizedEmail = normalizeEmail(raw.email)
  const normalizedPhone = normalizePhone(raw.phone)
  const normalizedName = normalizeName(raw.name)
  const normalizedCompany = normalizeCompany(raw.company)
  const normalizedTags = normalizeIcpTags(raw.icp_tags)
  const dedupeHash = generateDedupeHash(raw.email, raw.phone || null)

  return {
    email: raw.email, // Keep original for display
    normalized_email: normalizedEmail,
    name: normalizedName,
    phone: raw.phone || null, // Keep original for display
    normalized_phone: normalizedPhone,
    company: normalizedCompany,
    icp_tags: normalizedTags,
    dedupe_hash: dedupeHash,
  }
}
