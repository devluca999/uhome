/**
 * Unit tests for assertEnvironmentCapabilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { assertEnvironmentCapabilities } from '../../src/lib/env-safety'

const originalEnv = { ...process.env }

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function restoreEnv() {
  process.env = { ...originalEnv }
}

describe('assertEnvironmentCapabilities', () => {
  beforeEach(() => {
    restoreEnv()
  })

  afterEach(() => {
    restoreEnv()
  })

  it('allows canSeed when non-production', () => {
    setEnv({ SUPABASE_ENV: 'local', VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })
    expect(() => assertEnvironmentCapabilities({ canSeed: true })).not.toThrow()
  })

  it('throws on canSeed when production', () => {
    setEnv({ SUPABASE_ENV: 'production', VITE_SUPABASE_URL: 'https://prod.supabase.co' })
    expect(() => assertEnvironmentCapabilities({ canSeed: true })).toThrow(/canSeed is not allowed/)
  })

  it('allows canResetDb when non-production', () => {
    setEnv({ SUPABASE_ENV: 'staging', VITE_SUPABASE_URL: 'https://staging.supabase.co' })
    expect(() => assertEnvironmentCapabilities({ canResetDb: true })).not.toThrow()
  })

  it('throws on canResetDb when production', () => {
    setEnv({ SUPABASE_ENV: 'production', VITE_SUPABASE_URL: 'https://prod.supabase.co' })
    expect(() => assertEnvironmentCapabilities({ canResetDb: true })).toThrow(/canResetDb is not allowed/)
  })

  it('allows canWrite when non-production', () => {
    setEnv({ SUPABASE_ENV: 'local', VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })
    expect(() => assertEnvironmentCapabilities({ canWrite: true })).not.toThrow()
  })

  it('throws on canWrite when production', () => {
    setEnv({ SUPABASE_ENV: 'production', VITE_SUPABASE_URL: 'https://prod.supabase.co' })
    expect(() => assertEnvironmentCapabilities({ canWrite: true })).toThrow(/canWrite is not allowed/)
  })
})
