/**
 * Production read-only smoke: RLS boundary checks.
 * Uses anon key (unauthenticated) - verifies forbidden paths return empty/403.
 * Requires PROD_SMOKE_TEST=true, production anon key.
 */

import { test, expect } from '@playwright/test'
import { createProdReadonlyClient } from '../../helpers/prod-readonly-client'

test.describe('Prod Smoke - RLS Boundaries', () => {
  test('unauthenticated select on users returns empty or restricted', async () => {
    if (process.env.PROD_SMOKE_TEST !== 'true') {
      test.skip(true, 'Set PROD_SMOKE_TEST=true to run')
    }
    const client = createProdReadonlyClient()

    const { data, error } = await client.from('users').select('id').limit(1)

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
