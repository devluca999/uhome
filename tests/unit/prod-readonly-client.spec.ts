/**
 * Unit tests for prod-readonly-client write-guard.
 * Ensures insert, update, upsert, delete throw when using the wrapped client.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createProdReadonlyClient } from '../helpers/prod-readonly-client'

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

describe('prod-readonly-client', () => {
  beforeEach(() => {
    restoreEnv()
    setEnv({
      VITE_SUPABASE_URL: 'https://prod.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_ENV: 'production',
      PROD_SMOKE_TEST: 'true',
    })
  })

  afterEach(() => {
    restoreEnv()
  })

  it('throws on insert', () => {
    const client = createProdReadonlyClient()
    const table = client.from('rent_records')
    expect(() => (table as { insert: () => void }).insert({})).toThrow(/PROD READ-ONLY/)
  })

  it('throws on update', () => {
    const client = createProdReadonlyClient()
    const table = client.from('rent_records')
    expect(() => (table as { update: () => void }).update({})).toThrow(/PROD READ-ONLY/)
  })

  it('throws on upsert', () => {
    const client = createProdReadonlyClient()
    const table = client.from('rent_records')
    expect(() => (table as { upsert: () => void }).upsert({})).toThrow(/PROD READ-ONLY/)
  })

  it('throws on delete', () => {
    const client = createProdReadonlyClient()
    const table = client.from('rent_records')
    expect(() => (table as { delete: () => void }).delete()).toThrow(/PROD READ-ONLY/)
  })

  it('allows select (does not throw on access)', () => {
    const client = createProdReadonlyClient()
    const table = client.from('rent_records')
    expect(typeof (table as { select: (cols?: string) => unknown }).select).toBe('function')
  })

  it('throws when URL is missing', () => {
    setEnv({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: 'key' })
    expect(() => createProdReadonlyClient()).toThrow(/VITE_SUPABASE_URL/)
  })

  it('throws when anon key is missing', () => {
    setEnv({ VITE_SUPABASE_URL: 'http://x.com', VITE_SUPABASE_ANON_KEY: '' })
    expect(() => createProdReadonlyClient()).toThrow(/VITE_SUPABASE_ANON_KEY/)
  })
})
