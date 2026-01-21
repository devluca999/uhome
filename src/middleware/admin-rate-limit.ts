/**
 * Admin Rate Limiting Middleware
 *
 * Client-side rate limiting for admin actions to prevent abuse and brute-force attacks.
 * This complements server-side rate limiting in Edge Functions.
 */

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // Time window in milliseconds
  keyPrefix: string
}

interface RateLimitEntry {
  attempts: number
  resetAt: number // Timestamp when rate limit resets
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 10, // Max 10 admin actions per window
  windowMs: 60 * 1000, // 1 minute window
  keyPrefix: 'admin_rate_limit_',
}

/**
 * Check if an admin action is rate limited
 */
export function checkAdminRateLimit(actionType: string): { allowed: boolean; resetAt?: number } {
  const storageKey = `${DEFAULT_CONFIG.keyPrefix}${actionType}`

  try {
    const stored = sessionStorage.getItem(storageKey)
    const now = Date.now()

    if (!stored) {
      // First attempt, create entry
      const entry: RateLimitEntry = {
        attempts: 1,
        resetAt: now + DEFAULT_CONFIG.windowMs,
      }
      sessionStorage.setItem(storageKey, JSON.stringify(entry))
      return { allowed: true }
    }

    const entry: RateLimitEntry = JSON.parse(stored)

    // Check if window has expired
    if (now >= entry.resetAt) {
      // Reset window
      const newEntry: RateLimitEntry = {
        attempts: 1,
        resetAt: now + DEFAULT_CONFIG.windowMs,
      }
      sessionStorage.setItem(storageKey, JSON.stringify(newEntry))
      return { allowed: true }
    }

    // Check if max attempts exceeded
    if (entry.attempts >= DEFAULT_CONFIG.maxAttempts) {
      return { allowed: false, resetAt: entry.resetAt }
    }

    // Increment attempts
    entry.attempts++
    sessionStorage.setItem(storageKey, JSON.stringify(entry))
    return { allowed: true }
  } catch (error) {
    console.error('Error checking admin rate limit:', error)
    // On error, allow the action (fail open)
    return { allowed: true }
  }
}

/**
 * Record a failed admin action (e.g., failed authentication)
 */
export function recordFailedAdminAttempt(actionType: string = 'auth'): void {
  const storageKey = `${DEFAULT_CONFIG.keyPrefix}failed_${actionType}`

  try {
    const stored = sessionStorage.getItem(storageKey)
    const now = Date.now()

    if (!stored) {
      const entry: RateLimitEntry = {
        attempts: 1,
        resetAt: now + DEFAULT_CONFIG.windowMs,
      }
      sessionStorage.setItem(storageKey, JSON.stringify(entry))
      return
    }

    const entry: RateLimitEntry = JSON.parse(stored)

    // Check if window has expired
    if (now >= entry.resetAt) {
      const newEntry: RateLimitEntry = {
        attempts: 1,
        resetAt: now + DEFAULT_CONFIG.windowMs,
      }
      sessionStorage.setItem(storageKey, JSON.stringify(newEntry))
      return
    }

    // Increment failed attempts
    entry.attempts++
    sessionStorage.setItem(storageKey, JSON.stringify(entry))

    // If too many failed attempts, show warning
    if (entry.attempts >= DEFAULT_CONFIG.maxAttempts) {
      console.warn(`Rate limit exceeded for ${actionType}. Please wait before trying again.`)
    }
  } catch (error) {
    console.error('Error recording failed admin attempt:', error)
  }
}

/**
 * Reset rate limit for a specific action type
 */
export function resetAdminRateLimit(actionType: string): void {
  const storageKey = `${DEFAULT_CONFIG.keyPrefix}${actionType}`
  try {
    sessionStorage.removeItem(storageKey)
  } catch (error) {
    console.error('Error resetting admin rate limit:', error)
  }
}

/**
 * Get remaining attempts for an action type
 */
export function getRemainingAttempts(actionType: string): number {
  const storageKey = `${DEFAULT_CONFIG.keyPrefix}${actionType}`

  try {
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) {
      return DEFAULT_CONFIG.maxAttempts
    }

    const entry: RateLimitEntry = JSON.parse(stored)
    const now = Date.now()

    // Check if window has expired
    if (now >= entry.resetAt) {
      return DEFAULT_CONFIG.maxAttempts
    }

    return Math.max(0, DEFAULT_CONFIG.maxAttempts - entry.attempts)
  } catch (error) {
    console.error('Error getting remaining attempts:', error)
    return DEFAULT_CONFIG.maxAttempts
  }
}

/**
 * Hook to use admin rate limiting in components
 */
export function useAdminRateLimit(actionType: string) {
  const checkRateLimit = () => checkAdminRateLimit(actionType)
  const recordFailed = () => recordFailedAdminAttempt(actionType)
  const reset = () => resetAdminRateLimit(actionType)
  const getRemaining = () => getRemainingAttempts(actionType)

  return {
    checkRateLimit,
    recordFailed,
    reset,
    getRemaining,
  }
}
