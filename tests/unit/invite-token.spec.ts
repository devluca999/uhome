import { describe, expect, it } from 'vitest'
import { extractTokenFromInviteInput } from '@/lib/invite-token'

describe('extractTokenFromInviteInput', () => {
  it('parses full URL with query token', () => {
    expect(extractTokenFromInviteInput('https://uhome.app/accept-invite?token=abc-123')).toBe(
      'abc-123'
    )
  })

  it('parses path-only URL with query', () => {
    expect(extractTokenFromInviteInput('/accept-invite?token=xyz789')).toBe('xyz789')
  })

  it('parses legacy path segment', () => {
    expect(extractTokenFromInviteInput('https://x.com/accept-invite/legacy-token-1')).toBe(
      'legacy-token-1'
    )
  })

  it('parses path segment when extra path segments follow token', () => {
    expect(
      extractTokenFromInviteInput('https://uhome.app/accept-invite/abc-123/extra-stuff')
    ).toBe('abc-123')
  })

  it('parses token query without full URL via regex fallback', () => {
    expect(extractTokenFromInviteInput('foo/bar?token=encoded%2Btoken')).toBe('encoded+token')
  })

  it('returns null for misleading token?query= style input (no token param)', () => {
    expect(extractTokenFromInviteInput('token?query=abc-123')).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    expect(extractTokenFromInviteInput('  /accept-invite?token=trimmed  ')).toBe('trimmed')
  })

  it('parses raw token', () => {
    expect(extractTokenFromInviteInput('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    )
  })

  it('returns null for invalid input', () => {
    expect(extractTokenFromInviteInput('not a token!!!')).toBeNull()
  })
})
