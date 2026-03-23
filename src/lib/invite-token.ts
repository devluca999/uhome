/** Extract tenant invite token from pasted URL or raw token string. */
export function extractTokenFromInviteInput(input: string): string | null {
  const trimmed = input.trim()
  try {
    const urlObj = trimmed.includes('://')
      ? new URL(trimmed)
      : new URL(trimmed.startsWith('/') ? `http://local${trimmed}` : `http://local/${trimmed}`)
    const fromQuery = urlObj.searchParams.get('token')
    if (fromQuery) return fromQuery.trim()
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    const tokenIndex = pathParts.indexOf('accept-invite')
    if (tokenIndex !== -1 && pathParts[tokenIndex + 1]) {
      return pathParts[tokenIndex + 1]
    }
  } catch {
    // fall through to regex / raw token
  }
  const queryMatch = trimmed.match(/[?&]token=([^&]+)/)
  if (queryMatch?.[1]) {
    try {
      return decodeURIComponent(queryMatch[1].trim())
    } catch {
      return queryMatch[1].trim()
    }
  }
  const pathMatch = trimmed.match(/accept-invite\/([a-zA-Z0-9\-_]+)/)
  if (pathMatch?.[1]) return pathMatch[1]
  if (/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
    return trimmed
  }
  return null
}
