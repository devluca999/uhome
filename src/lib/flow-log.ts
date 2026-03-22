/**
 * Structured client-side flow logging for auth, invites, and critical paths.
 * Uses console only — no PII (emails/tokens are masked).
 */

function maskToken(value: string | undefined): string {
  if (!value) return '[empty]'
  const s = String(value)
  if (s.length <= 8) return '[redacted]'
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

function sanitizeContext(
  context?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!context) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(context)) {
    if (v === undefined) continue
    const keyLower = k.toLowerCase()
    if (
      keyLower.includes('token') ||
      keyLower.includes('email') ||
      keyLower.includes('password')
    ) {
      out[k] = typeof v === 'string' ? maskToken(v) : '[redacted]'
    } else {
      out[k] = v
    }
  }
  return Object.keys(out).length ? out : undefined
}

function formatMessage(flowId: string, step: string, detail: string): string {
  return `[flow:${flowId}] step:${step} — ${detail}`
}

export function logFlowError(
  flowId: string,
  step: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  const detail = err instanceof Error ? err.message : String(err)
  const safeCtx = sanitizeContext(context)
  if (safeCtx) {
    console.error(formatMessage(flowId, step, detail), safeCtx)
  } else {
    console.error(formatMessage(flowId, step, detail))
  }
}

export function logFlowWarn(
  flowId: string,
  step: string,
  message: string,
  context?: Record<string, unknown>
): void {
  const safeCtx = sanitizeContext(context)
  if (safeCtx) {
    console.warn(formatMessage(flowId, step, message), safeCtx)
  } else {
    console.warn(formatMessage(flowId, step, message))
  }
}
