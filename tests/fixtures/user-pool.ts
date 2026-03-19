/**
 * User pool fixtures for E2E tests
 *
 * Reduces Supabase auth rate limit pressure by reusing users within describe blocks.
 * Use beforeAll + shared credentials when tests in a describe can safely share
 * the same landlord/tenant (e.g. read-only flows, login tests).
 *
 * For tests that mutate user-specific state (create properties, assign tenants),
 * continue using beforeEach with fresh users or seedTestScenario.
 */

import {
  createTestLandlord,
  createTestTenant,
  generateTestEmail,
} from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'

export interface SharedLandlord {
  email: string
  password: string
  userId: string
}

export interface SharedTenant {
  email: string
  password: string
  userId: string
}

/**
 * Create shared landlord and tenant once for a describe block.
 * Use in test.beforeAll() - all tests in the describe share these users.
 * Reduces signups from N (per test) to 1 (per describe) when tests don't mutate shared state.
 */
export async function createSharedAuthForDescribe(): Promise<{
  landlord: SharedLandlord
  tenant: SharedTenant
}> {
  const landlordEmail = generateTestEmail('shared-landlord')
  const tenantEmail = generateTestEmail('shared-tenant')
  const password = 'testpassword123'

  const { userId: landlordId, error: landlordError } = await createTestLandlord(
    landlordEmail,
    password
  )
  if (landlordError || !landlordId) {
    throw new Error(`Failed to create shared landlord: ${JSON.stringify(landlordError)}`)
  }

  const { userId: tenantId, error: tenantError } = await createTestTenant(tenantEmail, password)
  if (tenantError || !tenantId) {
    await deleteUserAndData(landlordId)
    throw new Error(`Failed to create shared tenant: ${JSON.stringify(tenantError)}`)
  }

  return {
    landlord: { email: landlordEmail, password, userId: landlordId },
    tenant: { email: tenantEmail, password, userId: tenantId },
  }
}

/**
 * Create a shared landlord only (when tenant not needed).
 */
export async function createSharedLandlordForDescribe(): Promise<SharedLandlord> {
  const email = generateTestEmail('shared-landlord')
  const password = 'testpassword123'

  const { userId, error } = await createTestLandlord(email, password)
  if (error || !userId) {
    throw new Error(`Failed to create shared landlord: ${JSON.stringify(error)}`)
  }

  return { email, password, userId }
}
