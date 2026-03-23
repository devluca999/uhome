/**
 * Unit tests for environment guard - ensures production is never targeted by tests/seeds
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isProduction,
  enforceNonProduction,
  getEnvironmentStatus,
  enforceStagingOnly,
  ALLOWED_ENVS,
} from '../helpers/env-guard'

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

describe('env-guard', () => {
  beforeEach(() => {
    restoreEnv()
  })

  afterEach(() => {
    restoreEnv()
  })

  describe('isProduction', () => {
    it('returns true when SUPABASE_ENV=production', () => {
      setEnv({ SUPABASE_ENV: 'production', VITE_SUPABASE_URL: 'https://x.supabase.co' })
      expect(isProduction()).toBe(true)
    })

    it('returns true when VITE_SUPABASE_ENV=production', () => {
      // When SUPABASE_ENV is undefined, code checks VITE_SUPABASE_ENV
      // But setEnv helper may not be clearing SUPABASE_ENV properly
      // Set both to ensure test works as expected
      setEnv({ 
        SUPABASE_ENV: undefined as any,  // Explicitly undefined
        VITE_SUPABASE_ENV: 'production', 
        VITE_SUPABASE_URL: 'https://x.supabase.co' 
      })
      expect(isProduction()).toBe(true)
    })

    it('returns true when URL contains prod', () => {
      setEnv({ VITE_SUPABASE_URL: 'https://uhome-prod.supabase.co', SUPABASE_ENV: 'staging' })
      expect(isProduction()).toBe(true)
    })

    it('returns true when URL contains production', () => {
      setEnv({ VITE_SUPABASE_URL: 'https://production.supabase.co' })
      expect(isProduction()).toBe(true)
    })

    it('returns false when SUPABASE_ENV=local and URL is 127.0.0.1', () => {
      setEnv({ SUPABASE_ENV: 'local', VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })
      expect(isProduction()).toBe(false)
    })

    it('returns false when SUPABASE_ENV=staging', () => {
      setEnv({ SUPABASE_ENV: 'staging', VITE_SUPABASE_URL: 'https://staging.supabase.co' })
      expect(isProduction()).toBe(false)
    })

    it('returns false when URL contains staging', () => {
      setEnv({ VITE_SUPABASE_URL: 'https://staging.supabase.co' })
      expect(isProduction()).toBe(false)
    })
  })

  describe('enforceNonProduction', () => {
    it('throws when SUPABASE_ENV=production', () => {
      setEnv({ SUPABASE_ENV: 'production', VITE_SUPABASE_URL: 'https://x.supabase.co' })
      expect(() => enforceNonProduction()).toThrow(/restricted to non-production only/)
    })

    it('throws when VITE_SUPABASE_URL contains prod', () => {
      setEnv({ VITE_SUPABASE_URL: 'https://uhome-prod.supabase.co' })
      expect(() => enforceNonProduction()).toThrow(/restricted to non-production only/)
    })

    it('passes when SUPABASE_ENV=local and URL is 127.0.0.1', () => {
      setEnv({ SUPABASE_ENV: 'local', VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })
      expect(() => enforceNonProduction()).not.toThrow()
    })

    it('passes when SUPABASE_ENV=staging', () => {
      setEnv({ SUPABASE_ENV: 'staging', VITE_SUPABASE_URL: 'https://staging.supabase.co' })
      expect(() => enforceNonProduction()).not.toThrow()
    })

    it('passes when URL contains localhost', () => {
      setEnv({ VITE_SUPABASE_URL: 'http://localhost:54321' })
      expect(() => enforceNonProduction()).not.toThrow()
    })

    it('throws when VITE_SUPABASE_URL is empty', () => {
      setEnv({ VITE_SUPABASE_URL: '', SUPABASE_ENV: 'local' })
      expect(() => enforceNonProduction()).toThrow(/VITE_SUPABASE_URL is not set/)
    })

    it('throws when URL is ambiguous (no prod, no local/staging indicators)', () => {
      setEnv({ VITE_SUPABASE_URL: 'https://abcdef.supabase.co', SUPABASE_ENV: '' })
      expect(() => enforceNonProduction()).toThrow(/Cannot determine environment/)
    })
  })

  describe('enforceStagingOnly (deprecated)', () => {
    it('delegates to enforceNonProduction and throws on production', () => {
      setEnv({ SUPABASE_ENV: 'production', VITE_SUPABASE_URL: 'https://x.supabase.co' })
      expect(() => enforceStagingOnly()).toThrow(/restricted to non-production only/)
    })

    it('passes when allowed env', () => {
      setEnv({ SUPABASE_ENV: 'local', VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })
      expect(() => enforceStagingOnly()).not.toThrow()
    })
  })

  describe('getEnvironmentStatus', () => {
    it('includes allowedEnvs', () => {
      setEnv({ SUPABASE_ENV: 'local', VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })
      const status = getEnvironmentStatus()
      expect(status.allowedEnvs).toEqual(ALLOWED_ENVS)
    })

    it('reports isProduction correctly', () => {
      setEnv({ SUPABASE_ENV: 'production', VITE_SUPABASE_URL: 'https://x.supabase.co' })
      const status = getEnvironmentStatus()
      expect(status.isProduction).toBe(true)
      expect(status.isStaging).toBe(false)
    })

    it('reports isStaging when non-production', () => {
      setEnv({ SUPABASE_ENV: 'local', VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })
      const status = getEnvironmentStatus()
      expect(status.isProduction).toBe(false)
      expect(status.isStaging).toBe(true)
    })
  })
})
