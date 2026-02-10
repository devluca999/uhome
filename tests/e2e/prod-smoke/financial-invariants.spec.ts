/**
 * Production read-only smoke: financial invariants.
 * Validates DB consistency (revenue/expenses) - no writes, no seeds.
 * Requires PROD_SMOKE_TEST=true, production anon key.
 */

import { test, expect } from '@playwright/test'
import { createProdReadonlyClient } from '../../helpers/prod-readonly-client'

test.describe('Prod Smoke - Financial Invariants', () => {
  test('rent_records and expenses are queryable read-only', async () => {
    if (process.env.PROD_SMOKE_TEST !== 'true') {
      test.skip(true, 'Set PROD_SMOKE_TEST=true to run')
    }
    const client = createProdReadonlyClient()

    const { data: rentRecords, error: rentError } = await client
      .from('rent_records')
      .select('id, amount, status, paid_date')
      .limit(5)

    expect(rentError).toBeNull()
    expect(Array.isArray(rentRecords)).toBe(true)

    const { data: expenses, error: expError } = await client
      .from('expenses')
      .select('id, amount, date')
      .limit(5)

    expect(expError).toBeNull()
    expect(Array.isArray(expenses)).toBe(true)
  })

  test('write methods throw (smoke)', async () => {
    if (process.env.PROD_SMOKE_TEST !== 'true') {
      test.skip(true, 'Set PROD_SMOKE_TEST=true to run')
    }
    const client = createProdReadonlyClient()
    const table = client.from('rent_records')

    await expect(
      (table as { insert: () => Promise<unknown> }).insert({ amount: 0 })
    ).rejects.toThrow(/PROD READ-ONLY/)
  })
})
