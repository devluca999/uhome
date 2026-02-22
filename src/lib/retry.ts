/**
 * Retry utility for transient failures (network, 5xx, rate limits).
 * Use for Supabase/API calls that may fail temporarily.
 */

export interface RetryOptions {
  /** Max attempts including the first try (default: 3) */
  maxAttempts?: number
  /** Base delay in ms; uses exponential backoff (default: 1000) */
  baseDelayMs?: number
  /** Optional: only retry when this returns true */
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  shouldRetry: () => true,
}

/** Default: retry on network errors, 5xx, 429 (rate limit). Do not retry 4xx (except 429). */
export function isRetryableError(error: unknown): boolean {
  if (error == null) return false
  const msg = String((error as Error)?.message ?? error).toLowerCase()
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) return true
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) return true
  if (msg.includes('429') || msg.includes('rate limit')) return true
  return false
}

/** Sleep for ms (returns a Promise). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute an async function with retry on transient failures.
 * @param fn - Async function to execute (no args)
 * @param options - Retry options
 * @returns Result of fn()
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { maxAttempts, baseDelayMs, shouldRetry: customShouldRetry } = opts
  const shouldRetry = customShouldRetry ?? isRetryableError

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts || !shouldRetry(err)) throw err
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      await sleep(delay)
    }
  }
  throw lastError
}
