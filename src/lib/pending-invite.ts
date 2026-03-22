/** sessionStorage key — must match historical usage in accept-invite flow */
export const PENDING_INVITE_TOKEN_KEY = 'pending_invite_token'

export function setPendingInviteToken(token: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, token)
}

export function getPendingInviteToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY)
}

export function clearPendingInviteToken(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY)
}

export function buildAcceptInvitePath(token: string): string {
  return `/accept-invite?token=${encodeURIComponent(token)}`
}
