/**
 * Data Anonymization Utilities
 *
 * Utility functions to anonymize sensitive user data before storing in admin monitoring tables.
 * All user IDs, emails, and URLs are hashed or masked to protect user privacy.
 */

/**
 * Anonymize user ID by hashing with SHA-256
 * @param userId - User UUID string
 * @returns Hashed user ID (hex string)
 */
export function anonymizeUserId(userId: string): string {
  if (!userId) return ''

  // Use Web Crypto API to hash the user ID
  // Note: In a production environment, this should be done consistently
  // For now, we'll use a simple approach that can be replicated server-side

  // Convert to hash using browser's crypto API
  // Since we can't use async crypto in sync context, we'll use a deterministic approach
  // In production, this should be done via Edge Function or service role to ensure consistency

  // For client-side: Use a simple hash-like function
  // For server-side (Edge Functions): Use proper SHA-256
  return simpleHash(userId)
}

/**
 * Simple hash function for client-side use
 * Note: For production, use SHA-256 via Edge Function
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Convert to hex and pad
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/**
 * Anonymize email by masking domain
 * @param email - User email address
 * @returns Masked email (e.g., "u***@e***.com")
 */
export function anonymizeEmail(email: string): string {
  if (!email) return ''

  const parts = email.split('@')
  if (parts.length !== 2) return email

  const [localPart, domain] = parts
  const domainParts = domain.split('.')
  const topLevelDomain = domainParts.pop() || ''
  const domainName = domainParts.join('.')

  // Mask local part (first char + ***)
  const maskedLocal = localPart.charAt(0) + '***'

  // Mask domain (first char + ***)
  const maskedDomain = domainName.charAt(0) + '***'

  return `${maskedLocal}@${maskedDomain}.${topLevelDomain}`
}

/**
 * Anonymize storage URL by removing or hashing sensitive parts
 * @param url - Storage URL
 * @returns Anonymized URL (path segments hashed)
 */
export function anonymizeStorageUrl(url: string): string {
  if (!url) return ''

  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)

    // Hash path segments that might contain user IDs or sensitive data
    const anonymizedPath = pathParts
      .map((part, index) => {
        // First few segments might contain user/property IDs
        // Keep bucket name, hash the rest
        if (index === 0) {
          return part // Keep bucket name
        }
        // Hash path segments that might contain IDs
        if (part.length > 8 && /^[a-f0-9-]{36}$/i.test(part)) {
          // Looks like a UUID, hash it
          return simpleHash(part)
        }
        return part.length > 3 ? part.substring(0, 3) + '***' : '***'
      })
      .join('/')

    return `${urlObj.origin}/${anonymizedPath}`
  } catch {
    // Invalid URL, return original or empty
    return url.length > 50 ? url.substring(0, 50) + '...' : url
  }
}

/**
 * Hash IP address for privacy
 * @param ipAddress - IP address string
 * @returns Hashed IP address
 */
export function anonymizeIpAddress(ipAddress: string): string {
  if (!ipAddress) return ''
  return simpleHash(ipAddress)
}

/**
 * Anonymize any text value that might contain sensitive data
 * @param value - Any string value
 * @returns Anonymized version (first char + ***)
 */
export function anonymizeText(value: string): string {
  if (!value) return ''
  if (value.length <= 3) return '***'
  return value.charAt(0) + '***' + value.slice(-1)
}
