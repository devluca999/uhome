// Production-Realistic Demo Data Seeding Script for uhome
// Run with: npm run seed:demo
// Remote staging: set SEED_SUPABASE_URL=https://<ref>.supabase.co (optional if VITE_SUPABASE_URL is stable),
// CONFIRM_STAGING_RESEED=yes, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY for that project.
//
// This script creates comprehensive, production-realistic demo data for staging only.
// Hard-fails if run against production.

import './load-dotenv'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { enforceNonProduction, isLocalSupabaseUrl } from '../tests/helpers/env-guard'
import { assertEnvironmentCapabilities } from '../src/lib/env-safety'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// CRITICAL: Hard fail if production detected
enforceNonProduction()
assertEnvironmentCapabilities({ canSeed: true })

// SEED_SUPABASE_URL wins so remote targets are not clobbered by local dotenv stacks (e.g. dotenvx override).
const supabaseUrl =
  process.env.SEED_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: VITE_SUPABASE_URL (or SEED_SUPABASE_URL / SUPABASE_URL)')
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY (for staging seeding)')
  process.exit(1)
}

const isUsingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Create anon client for signUp (requires anon key for proper password hashing)
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAnon = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

if (!isUsingServiceRole || !supabaseAnon) {
  console.error('❌ This script requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Cloud (e.g. staging) reseed: explicit opt-in so a mis-pointed .env cannot wipe staging silently.
if (!isLocalSupabaseUrl(supabaseUrl) && process.env.CONFIRM_STAGING_RESEED !== 'yes') {
  console.error(
    '❌ Refusing to seed a remote database without explicit confirmation.\n\n' +
      'Set CONFIRM_STAGING_RESEED=yes if you intend to run demo seed against this URL:\n' +
      `  ${supabaseUrl}\n\n` +
      'Production URLs are still blocked by enforceNonProduction().'
  )
  process.exit(1)
}

/**
 * Create and confirm a demo user with proper password hashing
 *
 * Uses signUp (proper password hashing) + admin confirmation, NOT admin.createUser.
 * admin.createUser bypasses password hashing and leads to "Invalid login credentials" errors.
 *
 * @param email - User email address
 * @param password - User password (will be properly hashed via signUp)
 * @param role - User role ('landlord' | 'tenant' | 'admin')
 * @returns User ID
 */
async function createAndConfirmDemoUser(
  email: string,
  password: string,
  role: 'landlord' | 'tenant' | 'admin'
): Promise<string> {
  console.log(`[createAndConfirmDemoUser] Creating ${role} user: ${email}`)

  // Step 1: Sign up user (proper password hashing through Supabase auth system)
  const { data, error: signUpError } = await supabaseAnon!.auth.signUp({
    email,
    password,
  })

  let userId: string
  let isNewUser = false

  if (signUpError) {
    // If user already exists, try to sign in to verify the password works
    const msg = (signUpError.message || '').toLowerCase()
    const isAlreadyRegistered =
      signUpError.status === 422 ||
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      msg.includes('user already')
    if (isAlreadyRegistered) {
      console.log(
        `[createAndConfirmDemoUser] User already exists, attempting sign in to verify password...`
      )
      const { data: signInData, error: signInError } = await supabaseAnon!.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !signInData.user) {
        // Password doesn't work - user exists but password is wrong
        console.log(
          `[createAndConfirmDemoUser] Existing user password invalid, deleting and recreating...`
        )

        const { data: usersList } = await supabase.auth.admin.listUsers()
        const existingUser = usersList?.users?.find(u => u.email === email)

        if (existingUser) {
          // Delete the existing user via admin API
          const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id)
          if (deleteError) {
            throw new Error(
              `User exists but password is invalid. Failed to delete: ${deleteError.message}. Please delete user manually from Supabase Auth dashboard.`
            )
          }
          console.log(`[createAndConfirmDemoUser] Deleted existing invalid user`)

          // Wait a moment for deletion to propagate
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Now try to sign up again
          const { data: retrySignUpData, error: retrySignUpError } =
            await supabaseAnon!.auth.signUp({
              email,
              password,
            })

          if (retrySignUpError || !retrySignUpData.user) {
            throw new Error(
              `Failed to sign up after deletion: ${retrySignUpError?.message || 'No user returned'}`
            )
          }

          userId = retrySignUpData.user.id
          isNewUser = true
          console.log(
            `[createAndConfirmDemoUser] SignUp successful after deletion. User ID: ${userId}`
          )
        } else {
          throw new Error(`User exists but could not find user ID to delete`)
        }
      } else {
        // Password works - user exists and is valid
        userId = signInData.user.id
        isNewUser = false
        console.log(`[createAndConfirmDemoUser] Existing user password valid. User ID: ${userId}`)
        await supabaseAnon!.auth.signOut()
      }
    } else {
      // Other error - extract message (AuthError may not serialize to JSON)
      const errorMsg =
        signUpError?.message ??
        (signUpError as { error_description?: string })?.error_description ??
        String(signUpError)
      console.error(`[createAndConfirmDemoUser] SignUp error:`, errorMsg)
      if (signUpError?.status) console.error(`  Status: ${signUpError.status}`)
      throw new Error(`Failed to sign up user: ${errorMsg}`)
    }
  } else if (!data.user) {
    // signUp can return no error but user: null when user already exists (identities: [])
    const identities = (data as { identities?: unknown[] })?.identities
    if (Array.isArray(identities) && identities.length === 0) {
      console.log(
        `[createAndConfirmDemoUser] User already exists (identities empty), attempting sign in...`
      )
      const { data: signInData, error: signInError } = await supabaseAnon!.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError || !signInData.user) {
        throw new Error(
          `User already exists but sign in failed. Try deleting the user in Supabase Studio (Auth > Users) and re-run, or use the correct password. Error: ${signInError?.message || 'no user'}`
        )
      }
      userId = signInData.user.id
      isNewUser = false
      console.log(`[createAndConfirmDemoUser] Existing user sign in ok. User ID: ${userId}`)
      await supabaseAnon!.auth.signOut()
    } else {
      throw new Error(`Failed to sign up user: No user returned from signup`)
    }
  } else {
    userId = data.user.id
    isNewUser = true
    console.log(`[createAndConfirmDemoUser] SignUp successful. User ID: ${userId}`)
  }

  // Step 2: Confirm user via admin API (only for newly created users)
  if (isNewUser) {
    console.log(`[createAndConfirmDemoUser] Confirming user via admin API...`)
    const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (confirmError) {
      throw new Error(`Failed to confirm user: ${confirmError.message}`)
    }

    console.log(`[createAndConfirmDemoUser] User confirmed successfully`)
  } else {
    console.log(
      `[createAndConfirmDemoUser] Skipping confirmation (user already exists and is valid)`
    )
  }

  // Step 3: Create/update user record in users table
  const { error: userError } = await supabase.from('users').upsert({ id: userId, email, role })

  if (userError) {
    throw new Error(`Failed to create user record: ${userError.message}`)
  }

  console.log(`[createAndConfirmDemoUser] User record created/updated in users table`)

  // Step 4: Verify authentication works (only for newly created users)
  if (isNewUser) {
    const { error: verifyError } = await supabaseAnon!.auth.signInWithPassword({
      email,
      password,
    })

    if (verifyError) {
      throw new Error(
        `[AUTH VERIFICATION FAILED] User created but cannot authenticate. Email: ${email}, Error: ${verifyError.message}`
      )
    }

    // Sign out the verification session (we just needed to verify it works)
    await supabaseAnon!.auth.signOut()

    console.log(`[createAndConfirmDemoUser] ✅ Authentication verification passed`)
  }

  return userId
}

/**
 * Clean up previous demo data before seeding
 *
 * Deletes all demo-related data in correct foreign key order to prevent
 * data accumulation across seed runs.
 *
 * @param landlordId - Demo landlord user ID
 */
async function cleanupDemoData(landlordId: string) {
  console.log('🧹 Cleaning up previous demo data...')

  // Get all properties owned by demo landlord
  const { data: demoProperties } = await supabase
    .from('properties')
    .select('id')
    .eq('owner_id', landlordId)

  const propertyIds = demoProperties?.map(p => p.id) || []

  if (propertyIds.length === 0) {
    console.log('   No existing demo data found\n')
    return
  }

  // Delete in correct order (respecting foreign keys)
  // Messages → Work Orders → Rent Records → Expenses → Tenant Invites → Leases → Tenants → Properties

  // 1. Delete messages (lease-scoped, but we'll delete via property IDs)
  const { data: leases } = await supabase.from('leases').select('id').in('property_id', propertyIds)

  const leaseIds = leases?.map(l => l.id) || []

  if (leaseIds.length > 0) {
    await supabase.from('messages').delete().in('lease_id', leaseIds)
  }

  // 2. Delete maintenance requests (work orders)
  await supabase.from('maintenance_requests').delete().in('property_id', propertyIds)

  // 3. Delete rent records
  await supabase.from('rent_records').delete().in('property_id', propertyIds)

  // 4. Delete expenses
  await supabase.from('expenses').delete().in('property_id', propertyIds)

  // 4b. Delete documents
  await supabase.from('documents').delete().in('property_id', propertyIds)

  // 5. Delete tenant invites
  await supabase.from('tenant_invites').delete().eq('created_by', landlordId)

  // 6. Delete leases (will cascade to dependent records if any)
  await supabase.from('leases').delete().in('property_id', propertyIds)

  // 7. Delete demo tenants (by email pattern)
  // First get tenant user IDs
  const { data: demoTenantUsers } = await supabase.auth.admin.listUsers()
  const demoTenantUserIds =
    demoTenantUsers?.users
      ?.filter(
        u =>
          u.email &&
          (u.email.endsWith('@demo.uhome.app') ||
            (u.email.includes('demo-tenant') && u.email.includes('@uhome.internal')))
      )
      .map(u => u.id) || []

  if (demoTenantUserIds.length > 0) {
    await supabase.from('tenants').delete().in('user_id', demoTenantUserIds)
  }

  // 8. Delete properties
  await supabase.from('properties').delete().eq('owner_id', landlordId)

  console.log(`   Cleaned up ${propertyIds.length} properties and associated data\n`)
}

/**
 * Create a tenant invite programmatically (for seed scripts)
 * @param propertyId - Property ID to invite tenant to
 * @param email - Tenant email address
 * @param landlordId - Landlord user ID creating the invite
 * @returns Invite ID
 */
async function createInviteProgrammatically(
  propertyId: string,
  email: string,
  landlordId: string
): Promise<{ inviteId: string }> {
  // Get property to find/create a unit
  const { data: property } = await supabase
    .from('properties')
    .select('id, rent_amount, rent_due_date')
    .eq('id', propertyId)
    .single()

  if (!property) {
    throw new Error(`Property ${propertyId} not found`)
  }

  // Find or create a unit for this property
  let unitId: string
  const { data: existingUnits } = await supabase
    .from('units')
    .select('id')
    .eq('property_id', propertyId)
    .limit(1)

  if (existingUnits && existingUnits.length > 0) {
    unitId = existingUnits[0].id
  } else {
    // Create a default unit
    const { data: newUnit, error: unitError } = await supabase
      .from('units')
      .insert({
        property_id: propertyId,
        unit_name: 'Unit 1',
        rent_amount: property.rent_amount,
        rent_due_date: property.rent_due_date,
      })
      .select('id')
      .single()

    if (unitError || !newUnit) {
      throw new Error(`Failed to create unit: ${unitError?.message}`)
    }
    unitId = newUnit.id
  }

  // Create draft lease (include property_id as it's still required)
  const fallbackRentAmount = property.rent_amount && property.rent_amount > 0 ? null : 1000
  const { data: draftLease, error: leaseError } = await supabase
    .from('leases')
    .insert({
      unit_id: unitId,
      property_id: propertyId, // Still required until migration removes it
      status: 'draft',
      lease_start_date: new Date().toISOString().split('T')[0],
      lease_end_date: null,
      rent_amount: property.rent_amount || fallbackRentAmount,
      rent_frequency: 'monthly',
      security_deposit: null,
    })
    .select('id')
    .single()

  if (leaseError || !draftLease) {
    throw new Error(`Failed to create draft lease: ${leaseError?.message}`)
  }

  // Generate unique token
  const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

  // Set expiration to 30 days from now
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Create invite
  const { data: invite, error: inviteError } = await supabase
    .from('tenant_invites')
    .insert({
      property_id: propertyId,
      email,
      token,
      expires_at: expiresAt,
      created_by: landlordId,
      lease_id: draftLease.id,
    })
    .select('id')
    .single()

  if (inviteError || !invite) {
    // Rollback: delete the draft lease if invite creation fails
    await supabase.from('leases').delete().eq('id', draftLease.id)
    throw new Error(`Failed to create invite: ${inviteError?.message}`)
  }

  return { inviteId: invite.id }
}

/**
 * Accept a tenant invite programmatically (for seed scripts)
 * @param inviteId - Invite ID to accept
 * @param userId - User ID of the tenant accepting the invite
 * @param email - Email address of the tenant
 * @returns Tenant ID and Lease ID
 */
async function acceptInviteProgrammatically(
  inviteId: string,
  userId: string,
  email: string
): Promise<{ tenantId: string; leaseId: string }> {
  // Get invite with lease details
  const { data: invite, error: inviteError } = await supabase
    .from('tenant_invites')
    .select('*, lease_id, property_id')
    .eq('id', inviteId)
    .single()

  if (inviteError || !invite) {
    throw new Error(`Invite not found: ${inviteError?.message}`)
  }

  if (invite.accepted_at) {
    throw new Error('Invite already accepted')
  }

  // Get lease
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .select('*')
    .eq('id', invite.lease_id)
    .single()

  if (leaseError || !lease) {
    throw new Error(`Lease not found: ${leaseError?.message}`)
  }

  // Create tenant record
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      user_id: userId,
      property_id: invite.property_id,
      lease_id: lease.id,
      move_in_date: new Date().toISOString().split('T')[0],
      lease_end_date: null,
    })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    throw new Error(`Failed to create tenant: ${tenantError?.message}`)
  }

  // Update lease to active and link to tenant
  // leases.tenant_id references users(id), not tenants(id)
  const { error: updateLeaseError } = await supabase
    .from('leases')
    .update({
      status: 'active',
      tenant_id: userId,
    })
    .eq('id', lease.id)

  if (updateLeaseError) {
    throw new Error(`Failed to activate lease: ${updateLeaseError.message}`)
  }

  // Mark invite as accepted
  const { error: acceptError } = await supabase
    .from('tenant_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inviteId)

  if (acceptError) {
    throw new Error(`Failed to mark invite as accepted: ${acceptError.message}`)
  }

  return { tenantId: tenant.id, leaseId: lease.id }
}

async function seedProductionDemoData() {
  console.log('🌱 Starting production-realistic demo data seeding...\n')
  console.log('⚠️  This script creates comprehensive demo data for staging only.\n')

  try {
    // ========================================================================
    // Step 1: Create Demo Landlord
    // ========================================================================
    const demoLandlordEmail = 'demo-landlord@uhome.internal'
    const demoLandlordPassword = 'DemoLandlord2024!'

    let demoLandlordId: string

    const { data: existingLandlord } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', demoLandlordEmail)
      .single()

    if (existingLandlord) {
      demoLandlordId = existingLandlord.id
      if (existingLandlord.role !== 'landlord') {
        await supabase.from('users').update({ role: 'landlord' }).eq('id', demoLandlordId)
      }
      console.log(`✅ Using existing demo landlord: ${demoLandlordEmail}`)
    } else {
      demoLandlordId = await createAndConfirmDemoUser(
        demoLandlordEmail,
        demoLandlordPassword,
        'landlord'
      )
      console.log(`✅ Created demo landlord: ${demoLandlordEmail}`)
    }

    console.log('\n📋 Demo Credentials:')
    console.log(`   Landlord: ${demoLandlordEmail} / ${demoLandlordPassword}\n`)

    // ========================================================================
    // Step 1a: Ensure Demo Admin User Exists
    // ========================================================================
    const demoAdminEmail = 'admin@uhome.internal'
    const demoAdminPassword = 'DemoAdmin2024!'

    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', demoAdminEmail)
      .single()

    if (existingAdmin) {
      if (existingAdmin.role !== 'admin') {
        await supabase.from('users').update({ role: 'admin' }).eq('id', existingAdmin.id)
      }
      console.log(`✅ Using existing demo admin: ${demoAdminEmail}`)
    } else {
      const demoAdminId = await createAndConfirmDemoUser(demoAdminEmail, demoAdminPassword, 'admin')
      console.log(`✅ Created demo admin: ${demoAdminEmail} (user_id: ${demoAdminId})`)
    }

    console.log(`   Admin:    ${demoAdminEmail} / ${demoAdminPassword}\n`)

    // ========================================================================
    // Step 0: Clean up previous demo data
    // ========================================================================
    await cleanupDemoData(demoLandlordId)

    // ========================================================================
    // Step 2: Create Properties, Units, and Leases (Property → Unit → Lease hierarchy)
    // ========================================================================
    const propertyTemplates = [
      {
        name: 'Willow 2BR Flat',
        address: '1200 Market St #4B, San Francisco, CA 94102',
        property_type: '2-bedroom apartment',
        rules: 'No smoking. Pets with deposit. Quiet hours 10pm–7am.',
        units: [{ unit_name: '4B', rent_amount: 2650, rent_due_date: 1 }],
      },
      {
        name: 'Harbor View 3BR House',
        address: '88 Bay Laurel Dr, Oakland, CA 94610',
        property_type: '3-bedroom house',
        rules: 'Yard maintenance included. Tenant pays water over cap.',
        units: [{ unit_name: 'Main', rent_amount: 3400, rent_due_date: 5 }],
      },
      {
        name: 'Mission Loft Studio',
        address: '450 Valencia St #206, San Francisco, CA 94103',
        property_type: 'Studio',
        rules: 'Utilities included up to $120/mo. No short-term sublets.',
        units: [{ unit_name: '206', rent_amount: 1895, rent_due_date: 1 }],
      },
      {
        name: 'Presidio 1BR Classic',
        address: '2100 Sacramento St #12, San Francisco, CA 94115',
        property_type: '1-bedroom apartment',
        rules: 'Street parking only. Coin laundry in basement.',
        units: [{ unit_name: '12', rent_amount: 2250, rent_due_date: 1 }],
      },
      {
        name: 'Lake Merritt 2BR Condo',
        address: '199 10th St #908, Oakland, CA 94607',
        property_type: '2-bedroom condo',
        rules: 'HOA quiet rules apply. One reserved parking space.',
        units: [{ unit_name: '908', rent_amount: 2950, rent_due_date: 1 }],
      },
      {
        name: 'SoMa Commercial Bay',
        address: '600 Townsend St Unit C, San Francisco, CA 94103',
        property_type: 'Commercial unit',
        rules: 'CAM charges reconciled annually. Delivery window 7–9am weekdays.',
        units: [{ unit_name: 'C', rent_amount: 4200, rent_due_date: 1 }],
      },
      {
        name: 'Rockridge 3BR Townhouse',
        address: '5525 Lawton Ave, Oakland, CA 94618',
        property_type: '3-bedroom townhouse',
        rules: 'Trash/recycle per city schedule. Small pets OK.',
        units: [{ unit_name: 'TH-A', rent_amount: 3800, rent_due_date: 5 }],
      },
      {
        name: 'North Beach 1BR Condo',
        address: '800 Columbus Ave #3, San Francisco, CA 94133',
        property_type: '1-bedroom condo',
        rules: 'Roof deck shared. No BBQ on deck after 9pm.',
        units: [{ unit_name: '3', rent_amount: 2450, rent_due_date: 1 }],
      },
    ]

    const TENANT_SEED_ROWS = [
      { name: 'Marcus Webb', email: 'marcus.webb@demo.uhome.app', propertyIndex: 0 },
      { name: 'Priya Sharma', email: 'priya.sharma@demo.uhome.app', propertyIndex: 1 },
      { name: 'Devon Carter', email: 'devon.carter@demo.uhome.app', propertyIndex: 1 },
      { name: 'Sofia Reyes', email: 'sofia.reyes@demo.uhome.app', propertyIndex: 2 },
      { name: 'Jordan Kim', email: 'jordan.kim@demo.uhome.app', propertyIndex: 3 },
      { name: 'Aaliyah Brooks', email: 'aaliyah.brooks@demo.uhome.app', propertyIndex: 4 },
      { name: 'Ethan Park', email: 'ethan.park@demo.uhome.app', propertyIndex: 5 },
      { name: 'Chloe Martin', email: 'chloe.martin@demo.uhome.app', propertyIndex: 6 },
      { name: 'Tobias Nguyen', email: 'tobias.nguyen@demo.uhome.app', propertyIndex: 7 },
      { name: 'Imani Hassan', email: 'imani.hassan@demo.uhome.app', propertyIndex: 7 },
    ] as const

    // Check for existing properties to avoid duplicates
    const createdProperties: Array<{
      id: string
      name: string
      address: string
      rules: string
      units: Array<{
        id: string
        unit_name: string
        rent_amount: number
        rent_due_date: number
      }>
    }> = []

    const propertyNames = propertyTemplates.map(p => p.name)
    const { data: existingProps } = await supabase
      .from('properties')
      .select('id, name, address, rules')
      .eq('owner_id', demoLandlordId)
      .in('name', propertyNames)

    if (existingProps && existingProps.length > 0) {
      console.log(`✅ Found ${existingProps.length} existing properties, using them with units`)

      // Load existing units for these properties
      for (const property of existingProps) {
        const { data: existingUnits } = await supabase
          .from('units')
          .select('id, unit_name, rent_amount, rent_due_date, property_id')
          .eq('property_id', property.id)

        createdProperties.push({
          ...property,
          units: existingUnits || [],
        })
      }
    } else {
      // Create new properties and units
      for (const propertyTemplate of propertyTemplates) {
        // Create property (keeping rent_amount for now until properties table is migrated)
        const { data: property, error: propError } = await supabase
          .from('properties')
          .insert({
            owner_id: demoLandlordId,
            name: propertyTemplate.name,
            address: propertyTemplate.address,
            rules: propertyTemplate.rules,
            property_type: propertyTemplate.property_type,
            rent_amount: 0, // Default value, rent_amount now comes from units
            rent_due_date: 1, // Default value
          })
          .select('id, name, address, rules')
          .single()

        if (propError) throw propError

        // Create units for this property
        const unitsToCreate = propertyTemplate.units.map(unit => ({
          property_id: property.id,
          unit_name: unit.unit_name,
          rent_amount: unit.rent_amount,
          rent_due_date: unit.rent_due_date,
        }))

        const { data: createdUnits, error: unitError } = await supabase
          .from('units')
          .insert(unitsToCreate)
          .select('id, unit_name, rent_amount, rent_due_date, property_id')

        if (unitError) throw unitError

        createdProperties.push({
          ...property,
          units: createdUnits || [],
        })

        console.log(
          `✅ Created property "${property.name}" with ${createdUnits?.length || 0} units`
        )
      }
    }

    if (createdProperties.length === 0) {
      throw new Error('Failed to create or find properties')
    }

    const propertyIds = createdProperties.map(p => p.id)
    console.log(`✅ Working with ${propertyIds.length} properties\n`)

    // ========================================================================
    // Step 3: Primary demo tenant via invite flow (first TENANT_SEED_ROWS)
    // ========================================================================
    const demoTenantEmail = TENANT_SEED_ROWS[0].email
    const demoTenantPassword = 'DemoTenant2024!'

    let demoTenantUserId: string
    let demoTenantId: string | null = null
    let demoLeaseId: string | null = null

    // Check if demo tenant user exists
    const { data: existingDemoTenantUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', demoTenantEmail)
      .single()

    if (existingDemoTenantUser) {
      demoTenantUserId = existingDemoTenantUser.id
      if (existingDemoTenantUser.role !== 'tenant') {
        await supabase.from('users').update({ role: 'tenant' }).eq('id', demoTenantUserId)
      }
      console.log(`✅ Using existing demo tenant user: ${demoTenantEmail}`)

      // Check if tenant record and lease exist
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', demoTenantUserId)
        .single()

      if (existingTenant) {
        demoTenantId = existingTenant.id
        // Check for active lease
        const { data: existingLease } = await supabase
          .from('leases')
          .select('id')
          .eq('tenant_id', demoTenantId)
          .eq('status', 'active')
          .single()
        if (existingLease) {
          demoLeaseId = existingLease.id
        }
      }
    } else {
      // Create demo tenant user
      demoTenantUserId = await createAndConfirmDemoUser(
        demoTenantEmail,
        demoTenantPassword,
        'tenant'
      )
      console.log(`✅ Created demo tenant user: ${demoTenantEmail}`)
    }

    // Use first property for demo tenant
    const demoPropertyId = propertyIds[0]

    // Create invite for demo tenant (using real invite flow)
    if (!demoTenantId || !demoLeaseId) {
      console.log('📧 Creating invite for demo tenant via real invite flow...')
      const { inviteId } = await createInviteProgrammatically(
        demoPropertyId,
        demoTenantEmail,
        demoLandlordId
      )

      // Accept invite programmatically (simulating real acceptance flow)
      console.log('✅ Accepting invite for demo tenant...')
      const { tenantId, leaseId } = await acceptInviteProgrammatically(
        inviteId,
        demoTenantUserId,
        demoTenantEmail
      )

      demoTenantId = tenantId
      demoLeaseId = leaseId
      console.log(
        `✅ Demo tenant added via real invite flow (tenant ID: ${tenantId}, lease ID: ${leaseId})`
      )
    } else {
      console.log(
        `✅ Demo tenant already has active lease (tenant ID: ${demoTenantId}, lease ID: ${demoLeaseId})`
      )
    }

    console.log(`\n📋 Demo Tenant Credentials:`)
    console.log(`   Tenant: ${demoTenantEmail} / ${demoTenantPassword}\n`)

    // ========================================================================
    // Step 4: Create remaining tenants from TENANT_SEED_ROWS (roommates share leases)
    // ========================================================================
    const tenantUserIds: string[] = [demoTenantUserId]
    const tenantLeases: Array<{ tenantId: string; leaseId: string; propertyId: string }> = []

    if (demoTenantId && demoLeaseId) {
      tenantLeases.push({
        tenantId: demoTenantId,
        leaseId: demoLeaseId,
        propertyId: demoPropertyId,
      })
    }

    const extraTenantCount = TENANT_SEED_ROWS.length - 1
    console.log(`👥 Creating ${extraTenantCount} additional tenant users...`)

    const tenantCreationErrors: Array<{ email: string; error: string }> = []

    for (let i = 1; i < TENANT_SEED_ROWS.length; i++) {
      const row = TENANT_SEED_ROWS[i]
      const email = row.email
      const prop = createdProperties[row.propertyIndex]
      if (!prop?.units?.[0]) {
        tenantCreationErrors.push({
          email,
          error: `No unit for propertyIndex ${row.propertyIndex}`,
        })
        continue
      }
      const selectedUnit = prop.units[0]
      const property = prop

      try {
        console.log(
          `   👤 Creating tenant ${i}/${extraTenantCount}: ${email} for unit ${selectedUnit.unit_name} in ${property.name}`
        )

        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        let userId: string
        if (existingUser) {
          console.log(`      ℹ️  User already exists, using existing user ID`)
          userId = existingUser.id
        } else {
          console.log(`      👤 Creating new user...`)
          userId = await createAndConfirmDemoUser(email, 'DemoTenant2024!', 'tenant')
          console.log(`      ✅ User created with ID: ${userId}`)
        }

        tenantUserIds.push(userId)

        // Create tenant record directly (simplified for seeding)
        if (!property) {
          throw new Error(`Property not found for unit ${selectedUnit.id}`)
        }
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            user_id: userId,
            property_id: property.id,
            lease_id: null, // Will be set when lease is created/updated
            move_in_date: new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single()

        if (tenantError) throw tenantError
        const tenantId = tenant.id

        // Check if unit already has a lease
        const { data: existingLease } = await supabase
          .from('leases')
          .select('id, tenant_id')
          .eq('unit_id', selectedUnit.id)
          .eq('status', 'active')
          .maybeSingle()

        let leaseId: string

        if (existingLease) {
          // Add this tenant to existing lease (roommates)
          leaseId = existingLease.id
          console.log(`      🏠 Adding roommate to existing lease`)
        } else {
          // Create new lease for this unit
          if (!property) {
            throw new Error(`Property not found for unit ${selectedUnit.id}`)
          }
          // leases.tenant_id references users(id), not tenants(id)
          const { data: lease, error: leaseError } = await supabase
            .from('leases')
            .insert({
              unit_id: selectedUnit.id,
              property_id: property.id, // Still required until migration removes it
              tenant_id: userId,
              status: 'active',
              lease_start_date: new Date().toISOString().split('T')[0],
              lease_end_date: null, // Month-to-month
              rent_amount: selectedUnit.rent_amount,
              rent_frequency: 'monthly',
              security_deposit: selectedUnit.rent_amount, // 1 month's rent
            })
            .select('id')
            .single()

          if (leaseError) throw leaseError
          leaseId = lease.id
          console.log(`      🏠 Created new lease for unit`)
        }

        // Update tenant with lease_id
        await supabase.from('tenants').update({ lease_id: leaseId }).eq('id', tenantId)

        console.log(`      ✅ Tenant created (ID: ${tenantId}, Lease ID: ${leaseId})`)

        // Get property_id from the property object (units don't have property_id in the select)
        const propertyId = property?.id
        if (!propertyId) {
          throw new Error(`Property not found for unit ${selectedUnit.id}`)
        }

        tenantLeases.push({ tenantId, leaseId, propertyId })

        if ((i + 1) % 3 === 0 || i === TENANT_SEED_ROWS.length - 1) {
          console.log(
            `   ✅ Progress: ${i + 1}/${extraTenantCount} additional tenants processed`
          )
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
        console.error(`   ❌ Failed to create tenant ${email}:`, errorMessage)
        tenantCreationErrors.push({ email, error: errorMessage })

        // Log full error object for debugging
        console.error(`      Full error:`, error)

        // Log stack trace for debugging
        if (error instanceof Error && error.stack) {
          console.error(`      Stack trace:`, error.stack)
        }

        // Continue with next tenant to create as many as possible
      }
    }

    // Log summary of tenant creation
    if (tenantCreationErrors.length > 0) {
      console.warn(`\n⚠️  ${tenantCreationErrors.length} tenant creation failures:`)
      tenantCreationErrors.forEach(({ email, error }) => {
        console.warn(`   - ${email}: ${error}`)
      })
    }

    console.log(`✅ Created ${tenantLeases.length} tenant-lease pairs (including demo tenant)\n`)

    // ========================================================================
    // Step 5: Create Rent Records (~220 over 18 months, deterministic arcs)
    // ========================================================================
    console.log('💰 Creating rent records...')
    const today = new Date()

    function mix32(a: number, b: number): number {
      return (Math.imul((a + 1) ^ (b + 1), 2654435761) >>> 0) % 10000
    }

    /** Deterministic pseudo-random in [0, 1) from lease month slice. */
    function det01(leaseIdx: number, monthOffset: number, salt: number): number {
      return mix32(leaseIdx + salt * 31, monthOffset + salt * 17) / 10000
    }

    function propertyIndexForPropertyId(propertyId: string): number {
      return createdProperties.findIndex(p => p.id === propertyId)
    }

    function skipRentMonth(monthOffset: number, propertyIndex: number): boolean {
      if (propertyIndex < 0) return true
      if (monthOffset >= 13 && propertyIndex >= 6) return true
      if (monthOffset >= 10 && monthOffset <= 12 && propertyIndex === 2) return true
      return false
    }

    const uniqueLeaseRows: Array<{ tenantId: string; leaseId: string; propertyId: string }> = []
    const seenLeaseIds = new Set<string>()
    for (const tl of tenantLeases) {
      if (seenLeaseIds.has(tl.leaseId)) continue
      seenLeaseIds.add(tl.leaseId)
      uniqueLeaseRows.push(tl)
    }

    const rentRecords: Array<{
      property_id: string
      tenant_id: string
      lease_id: string
      amount: number
      due_date: string
      status: 'paid' | 'pending' | 'overdue'
      paid_date: string | null
      late_fee?: number
      notes?: string | null
      payment_method?: 'manual' | 'external'
      payment_method_label?: string | null
    }> = []

    if (tenantLeases.length === 0) {
      console.warn(`   ⚠️  No tenant-lease pairs found, skipping rent records creation`)
    } else {
      console.log(
        `   Creating rent records for ${uniqueLeaseRows.length} leases (${tenantLeases.length} tenant rows)...`
      )
    }

    for (let leaseIdx = 0; leaseIdx < uniqueLeaseRows.length; leaseIdx++) {
      const { tenantId, leaseId, propertyId } = uniqueLeaseRows[leaseIdx]

      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('rent_amount, unit_id')
        .eq('id', leaseId)
        .single()

      if (leaseError || !lease) {
        console.warn(
          `   ⚠️  Lease ${leaseId} not found: ${leaseError?.message || 'No lease data'}, skipping rent records`
        )
        continue
      }

      if (!lease.rent_amount || lease.rent_amount === 0) {
        console.warn(
          `   ⚠️  Lease ${leaseId} has invalid rent_amount (${lease.rent_amount}), skipping rent records`
        )
        continue
      }

      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('rent_due_date')
        .eq('id', lease.unit_id)
        .single()

      if (unitError) {
        console.warn(
          `   ⚠️  Unit ${lease.unit_id} not found: ${unitError.message}, using default due_date`
        )
      }

      const rentAmount = Number(lease.rent_amount)
      const dueDom = unit?.rent_due_date || 1
      const pi = propertyIndexForPropertyId(propertyId)

      for (let monthOffset = 17; monthOffset >= 0; monthOffset--) {
        if (skipRentMonth(monthOffset, pi)) continue

        const dueDateObj = new Date(today.getFullYear(), today.getMonth() - monthOffset, dueDom)
        const r = det01(leaseIdx, monthOffset, 0)

        let status: 'paid' | 'pending' | 'overdue'
        if (monthOffset === 0) {
          status = r > 0.3 ? 'paid' : 'pending'
        } else if (monthOffset <= 2) {
          if (r < 0.88) status = 'paid'
          else if (r < 0.94) status = 'overdue'
          else status = 'pending'
        } else if (monthOffset >= 7 && monthOffset <= 9) {
          if (r < 0.78) status = 'paid'
          else if (r < 0.92) status = 'overdue'
          else status = 'pending'
        } else {
          if (r < 0.91) status = 'paid'
          else if (r < 0.97) status = 'overdue'
          else status = 'pending'
        }

        let variedAmount = rentAmount
        if (status === 'overdue' && det01(leaseIdx, monthOffset, 2) < 0.2) {
          variedAmount = Math.max(100, rentAmount - 200)
        } else if (det01(leaseIdx, monthOffset, 5) < 0.12) {
          const d = (mix32(monthOffset + 1, leaseIdx + 2) % 101) - 50
          variedAmount = Math.max(100, Math.round(rentAmount + d))
        }

        let paidDate: string | null = null
        let lateFee = 0
        const payLabels = ['Zelle', 'ACH transfer', 'Check', 'Venmo'] as const
        let payment_method: 'external' | undefined
        let payment_method_label: string | null | undefined

        if (status === 'paid') {
          const isLate = det01(leaseIdx, monthOffset, 3) < 0.15
          const daysAfter = isLate
            ? 10 + (mix32(leaseIdx + 3, monthOffset + 1) % 18)
            : 1 + (mix32(leaseIdx + 5, monthOffset) % 5)
          const pd = new Date(dueDateObj)
          pd.setDate(pd.getDate() + daysAfter)
          paidDate = pd.toISOString().split('T')[0]
          if (daysAfter > 5) lateFee = Math.floor(variedAmount * 0.05)
          if (monthOffset === 0) {
            const dom = 1 + (mix32(leaseIdx, 99) % Math.max(1, today.getDate()))
            paidDate = new Date(today.getFullYear(), today.getMonth(), dom).toISOString().split('T')[0]
          }
          payment_method = 'external'
          payment_method_label = payLabels[mix32(leaseIdx, monthOffset + 8) % payLabels.length]
        } else if (status === 'overdue') {
          lateFee = Math.floor(variedAmount * 0.1)
        }

        const notes =
          status === 'overdue' && det01(leaseIdx, monthOffset, 4) < 0.3
            ? 'Tenant notified. Payment arrangement in progress.'
            : null

        rentRecords.push({
          property_id: propertyId,
          tenant_id: tenantId,
          lease_id: leaseId,
          amount: variedAmount,
          due_date: dueDateObj.toISOString().split('T')[0],
          status,
          paid_date: paidDate,
          late_fee: lateFee,
          notes,
          payment_method,
          payment_method_label,
        })
      }
    }

    const nLeaseRows = uniqueLeaseRows.length || 1
    const TARGET_EXTRA = Math.max(0, 220 - rentRecords.length)
    for (let k = 0; k < TARGET_EXTRA; k++) {
      const leaseIdx = k % nLeaseRows
      const { tenantId, leaseId, propertyId } = uniqueLeaseRows[leaseIdx]
      const monthOffset = Math.floor(k / nLeaseRows) % 18
      const pi = propertyIndexForPropertyId(propertyId)
      if (skipRentMonth(monthOffset, pi)) continue

      const { data: lease } = await supabase
        .from('leases')
        .select('rent_amount, unit_id')
        .eq('id', leaseId)
        .single()
      if (!lease?.rent_amount) continue

      const addAmount = 65 + (mix32(k, monthOffset) % 8) * 10
      const dueMid = new Date(today.getFullYear(), today.getMonth() - monthOffset, 15)
      const r = mix32(k + 50, monthOffset) / 10000
      let status: 'paid' | 'pending' | 'overdue' = 'paid'
      let paidDate: string | null = new Date(dueMid.getTime() + 2 * 86400000).toISOString().split('T')[0]
      if (monthOffset === 0 && r > 0.85) {
        status = 'pending'
        paidDate = null
      } else if (monthOffset > 0 && r > 0.92) {
        status = 'overdue'
        paidDate = null
      }

      rentRecords.push({
        property_id: propertyId,
        tenant_id: tenantId,
        lease_id: leaseId,
        amount: addAmount,
        due_date: dueMid.toISOString().split('T')[0],
        status,
        paid_date: paidDate,
        late_fee: status === 'overdue' ? Math.floor(addAmount * 0.08) : 0,
        notes: 'Parking / storage add-on (demo)',
        payment_method: status === 'paid' ? 'external' : undefined,
        payment_method_label: status === 'paid' ? 'Parking add-on (demo)' : undefined,
      })
    }

    if (rentRecords.length === 0) {
      console.error(`   ❌ No rent records to insert! tenantLeases.length: ${tenantLeases.length}`)
      console.error(
        `   This usually means all leases were skipped due to invalid rent_amount or missing lease data.`
      )
    } else {
      console.log(`   Attempting to insert ${rentRecords.length} rent records...`)

      // Log sample record for debugging
      console.log(`   Sample rent record:`, {
        property_id: rentRecords[0].property_id,
        tenant_id: rentRecords[0].tenant_id,
        lease_id: rentRecords[0].lease_id,
        amount: rentRecords[0].amount,
        status: rentRecords[0].status,
        due_date: rentRecords[0].due_date,
      })

      // Try inserting with minimal fields first to identify schema issues
      const { data: insertedRentRecords, error: rentError } = await supabase
        .from('rent_records')
        .insert(rentRecords)
        .select('id, status, paid_date')

      if (rentError) {
        console.error(`   ❌ Rent records insertion failed: ${rentError.message}`)
        console.error(`   Error details:`, rentError)
        console.warn(`   Schema issue detected. Trying with minimal fields...`)

        // Fallback: try with only required fields (schema may lack late_fee)
        const minimalRentRecords = rentRecords.map(r => ({
          property_id: r.property_id,
          tenant_id: r.tenant_id,
          lease_id: r.lease_id,
          amount: r.amount,
          due_date: r.due_date,
          status: r.status,
          paid_date: r.paid_date,
          late_fee: r.late_fee ?? 0,
          notes: r.notes ?? undefined,
        }))

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('rent_records')
          .insert(minimalRentRecords)
          .select('id')

        if (fallbackError) {
          console.error(`   ❌ Rent records creation completely failed: ${fallbackError.message}`)
          console.error(`   Fallback error details:`, fallbackError)
        } else {
          console.log(
            `✅ Created ${fallbackData?.length || minimalRentRecords.length} rent records (minimal fields)\n`
          )
        }
      } else {
        console.log(
          `✅ Created ${insertedRentRecords?.length || rentRecords.length} rent records\n`
        )

        // Log how many paid records with paid_date we created
        const paidWithDateCount =
          insertedRentRecords?.filter(
            (r: { status: string; paid_date?: string | null }) => r.status === 'paid' && r.paid_date
          ).length || 0
        console.log(`   📊 Of which ${paidWithDateCount} are paid with paid_date set`)
      }
    }

    // ========================================================================
    // Step 6: Create Expenses (72 curated rows / 18 months)
    // ========================================================================
    console.log('💸 Creating expenses...')
    type ExpCat = 'maintenance' | 'utilities' | 'repairs'
    const expenses: Array<{
      property_id: string
      name: string
      amount: number
      date: string
      category: ExpCat | null
      title?: string | null
      notes?: string | null
      is_recurring?: boolean
      recurring_frequency?: 'monthly' | 'quarterly' | 'yearly' | null
    }> = []

    for (let monthOffset = 17; monthOffset >= 0; monthOffset--) {
      const y = today.getFullYear()
      const m = today.getMonth() - monthOffset
      const calMonth = ((m % 12) + 12) % 12
      const winter = calMonth === 11 || calMonth === 0 || calMonth === 1
      const winterMul = winter ? 1.22 : 1

      const pidAt = (i: number) => propertyIds[i % propertyIds.length]
      const onDay = (day: number) =>
        new Date(y, today.getMonth() - monthOffset, day).toISOString().split('T')[0]

      expenses.push({
        property_id: pidAt(monthOffset),
        name: 'Property management fee',
        amount: Math.round((215 + (monthOffset % 4) * 12) * winterMul),
        date: onDay(4),
        category: 'maintenance',
        title: 'Management fee',
        notes: 'Demo: management_fee',
        is_recurring: true,
        recurring_frequency: 'monthly',
      })
      expenses.push({
        property_id: pidAt(monthOffset + 1),
        name: 'Landlord insurance (allocated)',
        amount: Math.round((165 + (monthOffset % 5) * 10) * winterMul),
        date: onDay(9),
        category: 'utilities',
        title: 'Insurance',
        notes: 'Demo: insurance (utilities category in schema)',
        is_recurring: true,
        recurring_frequency: 'monthly',
      })

      if (monthOffset % 3 === 0) {
        expenses.push({
          property_id: pidAt(monthOffset + 2),
          name: 'Common area utilities (quarterly allocation)',
          amount: Math.round(340 * winterMul),
          date: onDay(12),
          category: 'utilities',
          title: 'Utility commons',
          notes: 'Demo: quarterly commons',
        })
      } else {
        expenses.push({
          property_id: pidAt(monthOffset + 3),
          name: winter ? 'Snow removal / ice melt' : 'Seasonal landscaping',
          amount: Math.round((winter ? 280 : 195) * (winter ? 1.1 : 1)),
          date: onDay(14),
          category: 'maintenance',
          title: winter ? 'Winter services' : 'Landscaping',
          notes: 'Demo: seasonal',
        })
      }

      if (monthOffset === 5) {
        expenses.push({
          property_id: pidAt(2),
          name: 'Roof patch + emergency HVAC (combined invoice)',
          amount: 3400 + 1200,
          date: onDay(18),
          category: 'repairs',
          title: 'Major repair month',
          notes: 'Demo: roof patch $3400 + HVAC $1200',
        })
      } else if (monthOffset === 11) {
        expenses.push({
          property_id: pidAt(5),
          name: 'Interior painting — turnover',
          amount: 1800,
          date: onDay(21),
          category: 'maintenance',
          title: 'Improvements',
          notes: 'Demo: painting',
        })
      } else if (monthOffset === 8) {
        expenses.push({
          property_id: pidAt(4),
          name: 'Appliance replacement — dishwasher',
          amount: 800,
          date: onDay(16),
          category: 'repairs',
          notes: 'Demo: appliance replacement',
        })
      } else if (monthOffset === 14) {
        expenses.push({
          property_id: pidAt(1),
          name: 'Plumbing repair — leak under sink',
          amount: 450,
          date: onDay(11),
          category: 'repairs',
          notes: 'Demo: plumbing',
        })
      } else {
        expenses.push({
          property_id: pidAt(monthOffset + 4),
          name: 'Routine maintenance & supplies',
          amount: Math.round((95 + (monthOffset % 6) * 18) * winterMul),
          date: onDay(22),
          category: 'maintenance',
          notes: 'Demo: misc maintenance',
        })
      }
    }

    // Insert expenses with safety guard
    const { data: insertedExpenses, error: expenseError } = await supabase
      .from('expenses')
      .insert(expenses)
      .select('id')

    if (expenseError) {
      console.error(`   ❌ Expenses error: ${expenseError.message}`)
      throw new Error(`Failed to insert expenses: ${expenseError.message}`)
    }

    // Safety guard: Verify expenses were actually inserted
    if (!insertedExpenses || insertedExpenses.length === 0) {
      throw new Error(
        `❌ SAFETY GUARD: No expenses were inserted despite no error. Expected ${expenses.length} expenses.`
      )
    }

    if (insertedExpenses.length !== expenses.length) {
      console.warn(
        `   ⚠️  Only ${insertedExpenses.length} of ${expenses.length} expenses were inserted`
      )
    }

    console.log(`✅ Created ${insertedExpenses.length} expense records\n`)

    // ========================================================================
    // Step 7: Create Work Orders (18 curated — 4 open, 8 resolved, 6 closed)
    // ========================================================================
    console.log('🔧 Creating work orders...')
    type WoDef = {
      description: string
      category: string
      status: 'submitted' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
      daysAgo: number
      by: 'tenant' | 'landlord'
      sched?: boolean
      resolveInDays?: number
      /** Aligns with tenantLeases / tenantUserIds ordering from TENANT_SEED_ROWS + primary invite */
      tenantLeaseIndex: number
    }

    const workOrderDefs: WoDef[] = [
      {
        description:
          'HVAC not heating — bedroom zone. Bedroom is not getting heat. Living room is fine. Started 3 days ago.',
        category: 'HVAC',
        status: 'in_progress',
        daysAgo: 4,
        by: 'tenant',
        sched: true,
        tenantLeaseIndex: 1,
      },
      {
        description:
          'Kitchen faucet dripping constantly. Hot water faucet won\'t fully shut off. Dripping at ~1 drop/sec.',
        category: 'Plumbing',
        status: 'submitted',
        daysAgo: 2,
        by: 'tenant',
        tenantLeaseIndex: 0,
      },
      {
        description:
          'Bathroom exhaust fan making grinding noise. Started 1 week ago, getting louder. Vibrates the ceiling.',
        category: 'General',
        status: 'submitted',
        daysAgo: 7,
        by: 'tenant',
        tenantLeaseIndex: 5,
      },
      {
        description:
          'Bedroom window latch broken — won\'t lock. Latch snapped off. Window can be opened from outside.',
        category: 'General',
        status: 'in_progress',
        daysAgo: 3,
        by: 'tenant',
        tenantLeaseIndex: 7,
      },
      {
        description:
          'Dishwasher not draining. Standing water after cycle. Checked filter — still backed up.',
        category: 'Appliance',
        status: 'resolved',
        daysAgo: 18,
        by: 'tenant',
        resolveInDays: 8,
        tenantLeaseIndex: 4,
      },
      {
        description:
          'Mold spots in bathroom corner. Small mold growth near shower grout. Ventilation may be issue.',
        category: 'Plumbing',
        status: 'resolved',
        daysAgo: 22,
        by: 'tenant',
        resolveInDays: 8,
        tenantLeaseIndex: 8,
      },
      {
        description:
          'Front door buzzer not working. Intercom buzzes but door release doesn\'t open. Has been like this for a week.',
        category: 'Electrical',
        status: 'resolved',
        daysAgo: 30,
        by: 'tenant',
        sched: true,
        resolveInDays: 6,
        tenantLeaseIndex: 3,
      },
      {
        description:
          'Dryer takes 2+ cycles to dry clothes. Heating element seems weak. Clothes still damp after full cycle.',
        category: 'Appliance',
        status: 'resolved',
        daysAgo: 35,
        by: 'tenant',
        resolveInDays: 10,
        tenantLeaseIndex: 6,
      },
      {
        description:
          'Parking spot dispute with neighbor. Upstairs neighbor using assigned parking spot #4. Need resolution.',
        category: 'General',
        status: 'resolved',
        daysAgo: 60,
        by: 'tenant',
        resolveInDays: 8,
        tenantLeaseIndex: 1,
      },
      {
        description:
          'Roof deck furniture missing — 2 chairs. Two outdoor chairs from roof deck storage are gone. Unsure if moved or stolen.',
        category: 'General',
        status: 'resolved',
        daysAgo: 75,
        by: 'tenant',
        resolveInDays: 7,
        tenantLeaseIndex: 5,
      },
      {
        description:
          'Hot water intermittent — shower goes cold. Water heater cycling. Hot water lasts ~8 mins in morning rush.',
        category: 'Plumbing',
        status: 'resolved',
        daysAgo: 90,
        by: 'tenant',
        resolveInDays: 8,
        tenantLeaseIndex: 0,
      },
      {
        description:
          'Pest issue — ants in kitchen. Trail of ants near sink and cabinet corners. Appeared after rain.',
        category: 'General',
        status: 'resolved',
        daysAgo: 110,
        by: 'tenant',
        resolveInDays: 10,
        tenantLeaseIndex: 9,
      },
      {
        description:
          'AC unit not cooling below 78°F. Window AC runs constantly but won\'t get below 78. Filters cleaned.',
        category: 'HVAC',
        status: 'closed',
        daysAgo: 130,
        by: 'tenant',
        resolveInDays: 12,
        tenantLeaseIndex: 4,
      },
      {
        description:
          'Garbage disposal jammed. Humming but not spinning. Reset button pressed — still jammed.',
        category: 'Plumbing',
        status: 'closed',
        daysAgo: 145,
        by: 'tenant',
        resolveInDays: 8,
        tenantLeaseIndex: 7,
      },
      {
        description:
          'Light fixture flickering in hallway. Overhead hallway light flickers when on for more than 5 minutes.',
        category: 'Electrical',
        status: 'closed',
        daysAgo: 160,
        by: 'tenant',
        resolveInDays: 7,
        tenantLeaseIndex: 3,
      },
      {
        description:
          'Bathroom tiles cracked near tub edge. 3 tiles along tub edge cracked. Worried about water getting behind.',
        category: 'General',
        status: 'closed',
        daysAgo: 180,
        by: 'tenant',
        resolveInDays: 10,
        tenantLeaseIndex: 6,
      },
      {
        description:
          'Back door deadbolt stiff — hard to lock. Deadbolt requires a lot of force. Key gets stuck occasionally.',
        category: 'General',
        status: 'closed',
        daysAgo: 200,
        by: 'tenant',
        resolveInDays: 8,
        tenantLeaseIndex: 2,
      },
      {
        description:
          'Radiator making banging sounds. Loud banging from bedroom radiator when heat first kicks on in morning.',
        category: 'HVAC',
        status: 'closed',
        daysAgo: 220,
        by: 'tenant',
        resolveInDays: 10,
        tenantLeaseIndex: 0,
      },
    ]

    const workOrders: Array<{
      property_id: string | null
      tenant_id: string | null
      lease_id: string
      status: string
      category: string | null
      description: string
      public_description: string | null
      internal_notes: string | null
      created_by: string
      created_by_role: 'landlord' | 'tenant'
      scheduled_date: string | null
      visibility_to_tenants: boolean
      created_at?: string
      updated_at?: string
    }> = []

    for (let i = 0; i < workOrderDefs.length; i++) {
      const def = workOrderDefs[i]
      if (tenantLeases.length === 0) break
      const idx = Math.min(def.tenantLeaseIndex, tenantLeases.length - 1)
      const tl = tenantLeases[idx]
      const tenantUserId = tenantUserIds[idx] ?? demoTenantUserId
      const created = new Date(today.getTime() - def.daysAgo * 86400000)
      const createdIso = created.toISOString()
      let updatedIso = createdIso
      if (def.status === 'resolved' || def.status === 'closed') {
        const rd = def.resolveInDays ?? 4 + (i % 10)
        updatedIso = new Date(created.getTime() + rd * 86400000).toISOString()
      } else {
        updatedIso = new Date(created.getTime() + 86400000).toISOString()
      }
      let scheduledDate: string | null = null
      if (def.sched) {
        scheduledDate = new Date(today.getTime() + 3 * 86400000).toISOString()
      }
      const internal =
        def.status === 'resolved' || def.status === 'closed'
          ? `Closed after ${def.resolveInDays ?? 4}d (demo)`
          : def.sched
            ? 'Vendor scheduled (demo)'
            : 'Awaiting triage (demo)'

      workOrders.push({
        property_id: tl.propertyId,
        tenant_id: tl.tenantId,
        lease_id: tl.leaseId,
        status: def.status,
        category: def.category,
        description: def.description,
        public_description: def.description,
        internal_notes: internal,
        created_by: def.by === 'tenant' ? tenantUserId : demoLandlordId,
        created_by_role: def.by,
        scheduled_date: scheduledDate,
        visibility_to_tenants: true,
        created_at: createdIso,
        updated_at: updatedIso,
      })
    }

    const { error: workOrderError } = await supabase.from('maintenance_requests').insert(workOrders)
    if (workOrderError) {
      console.warn(`   ⚠️  Work orders error: ${workOrderError.message}`)
    } else {
      console.log(`✅ Created ${workOrders.length} work orders (18 curated statuses)\n`)
    }

    // ========================================================================
    // Step 7b: Documents (8 landlord-visible demo files)
    // ========================================================================
    console.log('📄 Creating documents...')
    const documentSeeds = [
      { file_name: 'Lease Agreement — Willow 2BR Flat (executed).pdf', file_type: 'application/pdf' },
      { file_name: 'Pet Addendum — Harbor View 3BR House.pdf', file_type: 'application/pdf' },
      { file_name: 'Move-in Inspection — Mission Loft Studio.pdf', file_type: 'application/pdf' },
      { file_name: 'Renters Insurance Certificate — Presidio 1BR.pdf', file_type: 'application/pdf' },
      { file_name: 'HOA Rules Acknowledgment — Lake Merritt 2BR Condo.pdf', file_type: 'application/pdf' },
      { file_name: 'CAM Lease Schedule — SoMa Commercial Bay.pdf', file_type: 'application/pdf' },
      { file_name: 'Annual Smoke & CO Inspection — Rockridge Townhouse.pdf', file_type: 'application/pdf' },
      { file_name: 'Roof Deck Addendum — North Beach 1BR Condo.pdf', file_type: 'application/pdf' },
    ]
    const documentInserts = documentSeeds.map((doc, d) => {
      const prop = createdProperties[d % createdProperties.length]
      const tl = tenantLeases.find(t => t.propertyId === prop.id)
      return {
        property_id: prop.id,
        lease_id: tl?.leaseId ?? null,
        uploaded_by: demoLandlordId,
        file_url: `https://demo.uhome.internal/storage/seed/${encodeURIComponent(doc.file_name)}`,
        file_name: doc.file_name,
        file_type: doc.file_type,
        visibility: 'landlord' as const,
      }
    })
    const { error: documentsError } = await supabase.from('documents').insert(documentInserts)
    if (documentsError) {
      console.warn(`   ⚠️  Documents error: ${documentsError.message}`)
    } else {
      console.log(`✅ Created ${documentInserts.length} document records\n`)
    }

    // ========================================================================
    // Step 8: Create Messages (50+ messages, lease-scoped)
    // ========================================================================
    console.log('💬 Creating messages...')
    const messageIntents: Array<'general' | 'maintenance' | 'billing' | 'notice'> = [
      'general',
      'maintenance',
      'billing',
      'notice',
    ]

    const messages: Array<{
      lease_id: string
      sender_id: string | null
      sender_role: 'tenant' | 'landlord'
      body: string
      intent: string
      status: 'open' | 'acknowledged' | 'resolved' | null
      message_type: 'landlord_tenant' | 'household'
    }> = []

    // Create message threads for each lease (back-and-forth conversations)
    const leasesForMessages = tenantLeases.slice(0, Math.min(tenantLeases.length, 8))
    for (let leaseIdx = 0; leaseIdx < leasesForMessages.length; leaseIdx++) {
      const { tenantId, leaseId } = leasesForMessages[leaseIdx]

      // Get all tenant user IDs for this lease (including roommates)
      const leaseTenants = await supabase.from('tenants').select('user_id').eq('lease_id', leaseId)

      const leaseTenantUserIds = (leaseTenants.data || []).map(t => t.user_id).filter(Boolean)

      // Get tenant user ID for this lease (find matching index in full tenantLeases array)
      const fullLeaseIdx = tenantLeases.findIndex(
        l => l.leaseId === leaseId && l.tenantId === tenantId
      )
      const primaryTenantUserId =
        fullLeaseIdx >= 0 && fullLeaseIdx < tenantUserIds.length
          ? tenantUserIds[fullLeaseIdx]
          : demoTenantUserId

      // Create landlord-tenant messages (5-8 messages per lease)
      const landlordMessagesPerLease = Math.floor(Math.random() * 4) + 5
      const intent = messageIntents[Math.floor(Math.random() * messageIntents.length)]

      const sampleMessages: Record<string, string[]> = {
        general: [
          'Hello, just wanted to check in about the property.',
          'Everything is going well, thanks!',
          'Thanks for the update.',
        ],
        maintenance: [
          'I noticed the sink is leaking in the kitchen.',
          "I'll schedule a plumber to take a look this week.",
          'Great, thank you!',
          'The plumber has been scheduled for Thursday.',
        ],
        billing: [
          'I sent the rent payment via Zelle yesterday.',
          'Received, thank you!',
          'Just wanted to confirm the payment went through.',
        ],
        notice: [
          'Reminder: Property inspection scheduled for next week.',
          'Noted, thanks for letting me know.',
        ],
      }

      const messagePool = sampleMessages[intent] || sampleMessages['general']

      // Landlord-tenant messages
      for (let i = 0; i < landlordMessagesPerLease; i++) {
        const isTenantMessage = i % 2 === 0
        const senderId = isTenantMessage ? primaryTenantUserId : demoLandlordId
        const senderRole = isTenantMessage ? 'tenant' : 'landlord'

        const messageText = messagePool[i % messagePool.length] || 'Message'

        messages.push({
          lease_id: leaseId,
          sender_id: senderId,
          sender_role: senderRole,
          body: messageText,
          intent,
          status: i === landlordMessagesPerLease - 1 && !isTenantMessage ? 'acknowledged' : null,
          message_type: 'landlord_tenant',
        })
      }

      // Create household messages if there are multiple tenants on this lease
      if (leaseTenantUserIds.length > 1) {
        const householdMessagesPerLease = Math.floor(Math.random() * 3) + 2 // 2-4 household messages

        const householdSampleMessages = [
          'Hey, the kitchen light bulb needs replacing.',
          'I replaced it, no problem!',
          'Thanks for taking care of that.',
          'When is trash day this week?',
          'Thursday, same as usual.',
          'Got it, thanks!',
          'The WiFi password is written on the router.',
          'Perfect, thanks for the reminder.',
        ]

        for (let i = 0; i < householdMessagesPerLease; i++) {
          const senderIdx = i % leaseTenantUserIds.length
          const senderId = leaseTenantUserIds[senderIdx]
          const messageText = householdSampleMessages[i % householdSampleMessages.length]

          messages.push({
            lease_id: leaseId,
            sender_id: senderId,
            sender_role: 'tenant',
            body: messageText,
            intent: 'general',
            status: null,
            message_type: 'household',
          })
        }
      }
    }

    // Insert messages with created_at (if possible, otherwise rely on default)
    const messageInserts = messages.map((msg, idx) => {
      const daysAgo = Math.floor(Math.random() * 30) + (messages.length - idx)
      const _createdAt = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      return {
        ...msg,
        created_at: _createdAt.toISOString(),
      }
    })

    const { error: messageError } = await supabase.from('messages').insert(messageInserts)
    if (messageError) {
      console.warn(`   ⚠️  Messages error: ${messageError.message}`)
    } else {
      console.log(
        `✅ Created ${messages.length} messages across ${Math.min(tenantLeases.length, 8)} lease threads\n`
      )
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('📊 Seeding Summary (Attempted):')
    console.log(`   ✅ Properties: ${propertyIds.length}`)
    console.log(`   ✅ Tenants: ${tenantLeases.length}`)
    console.log(`   ✅ Rent Records: ${rentRecords.length}`)
    console.log(`   ✅ Expenses: ${expenses.length}`)
    console.log(`   ✅ Work Orders: ${workOrders.length}`)
    console.log(`   ✅ Documents: ${documentInserts.length}`)
    console.log(`   ✅ Messages: ${messages.length}\n`)
    console.log(
      `Seeded: ${createdProperties.length} properties, ${tenantLeases.length} tenants, ${rentRecords.length} rent records, ${insertedExpenses.length} expenses, ${workOrders.length} work orders\n`
    )

    // ========================================================================
    // Verification: Query actual counts from database
    // ========================================================================
    console.log('🔍 Verifying seeded data in database...\n')

    try {
      // Verify tenants - query by property_id (simpler and more reliable than user_id lookup)
      const propertyIds = createdProperties.map(p => p.id)
      const { count: actualTenantCount, error: tenantCountError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .in('property_id', propertyIds)

      if (tenantCountError) {
        console.warn(`   ⚠️  Failed to query tenant count: ${tenantCountError.message}`)
        console.warn(`   Error details:`, tenantCountError)
      } else {
        console.log(
          `   📊 Tenants in DB: ${actualTenantCount || 0} (expected: ${tenantLeases.length})`
        )
        if ((actualTenantCount || 0) < tenantLeases.length) {
          console.warn(`   ⚠️  WARNING: Fewer tenants in DB than expected!`)

          // Debug: Try to get actual tenant records to see what's there
          const { data: actualTenants, error: debugError } = await supabase
            .from('tenants')
            .select('id, user_id, property_id, lease_id')
            .in('property_id', propertyIds)
            .limit(20)

          if (!debugError && actualTenants) {
            console.log(`   🔍 Debug: Found ${actualTenants.length} tenant records:`)
            actualTenants.slice(0, 5).forEach((t, i) => {
              console.log(
                `      ${i + 1}. Tenant ID: ${t.id}, Property: ${t.property_id}, Lease: ${t.lease_id || 'none'}`
              )
            })
          }
        }
      }

      // Verify paid rent records with paid_date
      const { count: paidRentCount, error: paidRentError } = await supabase
        .from('rent_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .not('paid_date', 'is', null)

      if (paidRentError) {
        console.warn(`   ⚠️  Failed to query paid rent count: ${paidRentError.message}`)
      } else {
        console.log(`   📊 Paid rent records with paid_date: ${paidRentCount || 0}`)
        if ((paidRentCount || 0) < 10) {
          console.warn(
            `   ⚠️  WARNING: Expected at least 10 paid rent records, found ${paidRentCount || 0}`
          )
        }
      }

      // Verify paid rent in current month (January 2026)
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]

      const { count: currentMonthPaidCount, error: currentMonthError } = await supabase
        .from('rent_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .not('paid_date', 'is', null)
        .gte('paid_date', currentMonthStart)
        .lte('paid_date', currentMonthEnd)

      if (currentMonthError) {
        console.warn(`   ⚠️  Failed to query current month rent: ${currentMonthError.message}`)
      } else {
        console.log(
          `   📊 Paid rent in current month (${currentMonthStart} to ${currentMonthEnd}): ${currentMonthPaidCount || 0}`
        )
        if ((currentMonthPaidCount || 0) === 0) {
          console.error(
            `   ❌ CRITICAL: No paid rent records in current month! Dashboard will show $0 revenue.`
          )
        }
      }

      // Verify properties
      const { count: propertyCount, error: propertyCountError } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', demoLandlordId)

      if (propertyCountError) {
        console.warn(`   ⚠️  Failed to query property count: ${propertyCountError.message}`)
      } else {
        console.log(
          `   📊 Properties in DB: ${propertyCount || 0} (expected: ${propertyIds.length})`
        )
      }

      // Final assertions
      console.log('\n✅ Verification complete\n')

      if ((actualTenantCount || 0) < 10) {
        console.error(
          '❌ FAILED: Expected at least 10 tenants, but only found',
          actualTenantCount || 0
        )
        console.error('   This indicates tenant creation loop failed. Check error logs above.')
      }

      if ((currentMonthPaidCount || 0) === 0) {
        console.error('❌ FAILED: No paid rent in current month')
        console.error('   Dashboard will show $0 revenue. Check rent record creation logic.')
      }

      if ((actualTenantCount || 0) >= 10 && (currentMonthPaidCount || 0) > 0) {
        console.log('✅ All critical verifications passed!')
      }
    } catch (verifyError) {
      console.error(
        '❌ Verification failed:',
        verifyError instanceof Error ? verifyError.message : String(verifyError)
      )
    }

    console.log('\n🎉 Demo data seeding complete!')
    console.log('\n💡 Demo Credentials:')
    console.log(`   Landlord: ${demoLandlordEmail} / ${demoLandlordPassword}`)
    console.log(`   Tenant: ${demoTenantEmail} / ${demoTenantPassword}`)
    console.log('\n💡 Log in with the demo credentials above to see the seeded data.\n')
  } catch (error) {
    console.error('\n❌ Error seeding demo data:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

// Run the seeding function
seedProductionDemoData()
