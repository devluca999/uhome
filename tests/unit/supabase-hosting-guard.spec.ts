import { describe, it, expect } from 'vitest'
import {
  assertProductionHostingDoesNotUseStagingSupabase,
  getHostingDeploymentLabel,
  isProductionOrPreviewForLogging,
  isStrictProductionHosting,
  resolveSupabaseEnvironmentName,
} from '../../src/lib/supabase-hosting-guard'

describe('resolveSupabaseEnvironmentName', () => {
  it('uses VITE label when set', () => {
    expect(resolveSupabaseEnvironmentName('staging', 'https://x.supabase.co')).toBe('staging')
  })

  it('infers local from URL', () => {
    expect(resolveSupabaseEnvironmentName(undefined, 'http://127.0.0.1:54321')).toContain('local')
  })
})

describe('getHostingDeploymentLabel', () => {
  it('returns local development in vite dev', () => {
    expect(getHostingDeploymentLabel(true, 'production')).toBe('local development')
  })

  it('maps vercel env values', () => {
    expect(getHostingDeploymentLabel(false, 'production')).toBe('production deployment')
    expect(getHostingDeploymentLabel(false, 'preview')).toBe('preview deployment')
  })
})

describe('isStrictProductionHosting', () => {
  it('is false in vite dev', () => {
    expect(isStrictProductionHosting(true, false, 'production', 'production')).toBe(false)
  })

  it('is true when hosting env is production', () => {
    expect(isStrictProductionHosting(false, true, 'production', 'staging')).toBe(true)
  })

  it('is true for production build with vite supabase env production', () => {
    expect(isStrictProductionHosting(false, true, '', 'production')).toBe(true)
  })
})

describe('assertProductionHostingDoesNotUseStagingSupabase', () => {
  it('no-ops when not production hosting', () => {
    expect(() =>
      assertProductionHostingDoesNotUseStagingSupabase({
        supabaseUrl: 'https://abc123.supabase.co',
        stagingProjectRefToForbid: 'abc123',
        isProductionHosting: false,
      })
    ).not.toThrow()
  })

  it('no-ops when forbid ref is empty', () => {
    expect(() =>
      assertProductionHostingDoesNotUseStagingSupabase({
        supabaseUrl: 'https://abc123.supabase.co',
        stagingProjectRefToForbid: '',
        isProductionHosting: true,
      })
    ).not.toThrow()
  })

  it('throws when production uses staging ref', () => {
    expect(() =>
      assertProductionHostingDoesNotUseStagingSupabase({
        supabaseUrl: 'https://stagingref.supabase.co',
        stagingProjectRefToForbid: 'stagingref',
        isProductionHosting: true,
      })
    ).toThrow(/staging Supabase project/)
  })
})

describe('isProductionOrPreviewForLogging', () => {
  it('classifies vercel production', () => {
    expect(isProductionOrPreviewForLogging(false, true, 'production')).toBe('production')
  })

  it('classifies preview', () => {
    expect(isProductionOrPreviewForLogging(false, true, 'preview')).toBe('preview')
  })
})
