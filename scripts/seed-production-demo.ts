// Production-Realistic Demo Data Seeding Script for uhome
// Run with: npm run seed:demo
//
// This script creates comprehensive, production-realistic demo data for staging only.
// Hard-fails if run against production.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// CRITICAL: Hard fail if production detected
import { enforceStagingOnly } from '../tests/helpers/env-guard'
enforceStagingOnly()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: VITE_SUPABASE_URL')
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

/**
 * Create and confirm a demo user with proper password hashing
 *
 * Uses signUp (proper password hashing) + admin confirmation, NOT admin.createUser.
 * admin.createUser bypasses password hashing and leads to "Invalid login credentials" errors.
 *
 * @param email - User email address
 * @param password - User password (will be properly hashed via signUp)
 * @param role - User role ('landlord' or 'tenant')
 * @returns User ID
 */
async function createAndConfirmDemoUser(
  email: string,
  password: string,
  role: 'landlord' | 'tenant'
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
    if (signUpError.message?.includes('already registered') || signUpError.status === 422) {
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
      // Other error
      const errorMsg = signUpError.message || 'No user returned from signup'
      console.error(`[createAndConfirmDemoUser] SignUp error:`, errorMsg)
      throw new Error(`Failed to sign up user: ${errorMsg}`)
    }
  } else if (!data.user) {
    throw new Error(`Failed to sign up user: No user returned from signup`)
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

  // 2. Delete work orders
  await supabase.from('work_orders').delete().in('property_id', propertyIds)

  // 3. Delete rent records
  await supabase.from('rent_records').delete().in('property_id', propertyIds)

  // 4. Delete expenses
  await supabase.from('expenses').delete().in('property_id', propertyIds)

  // 5. Delete tenant invites
  await supabase.from('tenant_invites').delete().eq('created_by', landlordId)

  // 6. Delete leases (will cascade to dependent records if any)
  await supabase.from('leases').delete().in('property_id', propertyIds)

  // 7. Delete demo tenants (by email pattern)
  // First get tenant user IDs
  const { data: demoTenantUsers } = await supabase.auth.admin.listUsers()
  const demoTenantUserIds =
    demoTenantUsers?.users
      ?.filter(u => u.email?.includes('demo-tenant') && u.email?.includes('@uhome.internal'))
      .map(u => u.id) || []

  if (demoTenantUserIds.length > 0) {
    await supabase.from('tenants').delete().in('user_id', demoTenantUserIds)
  }

  // 8. Delete properties
  await supabase.from('properties').delete().eq('owner_id', landlordId)

  console.log(`   Cleaned up ${propertyIds.length} properties and associated data\n`)
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
    // Step 0: Clean up previous demo data
    // ========================================================================
    await cleanupDemoData(demoLandlordId)

    // ========================================================================
    // Step 2: Create Properties, Units, and Leases (Property → Unit → Lease hierarchy)
    // ========================================================================
    const propertyTemplates = [
      {
        name: 'Oak Street Apartments',
        address: '123 Oak Street, San Francisco, CA 94102',
        rules: 'No smoking. Quiet hours after 10 PM. Pets allowed with deposit.',
        units: [
          { unit_name: '2A', rent_amount: 1450, rent_due_date: 1 },
          { unit_name: '2B', rent_amount: 1500, rent_due_date: 1 },
          { unit_name: '3A', rent_amount: 1550, rent_due_date: 1 },
        ]
      },
      {
        name: 'Pine Avenue Complex',
        address: '456 Pine Avenue, San Francisco, CA 94103',
        rules: 'No pets. Street parking available. Building has laundry facilities.',
        units: [
          { unit_name: '5B', rent_amount: 2800, rent_due_date: 5 },
          { unit_name: '5C', rent_amount: 2750, rent_due_date: 5 },
        ]
      },
      {
        name: 'Elm Drive House',
        address: '789 Elm Drive, San Francisco, CA 94104',
        rules: 'Garden access. Bicycle storage available. Tenant responsible for utilities.',
        units: [
          { unit_name: 'Main', rent_amount: 1850, rent_due_date: 15 },
        ]
      },
      {
        name: 'Maple Heights',
        address: '321 Maple Heights, San Francisco, CA 94105',
        rules: 'Pet-friendly. Covered parking. Modern amenities.',
        units: [
          { unit_name: '3C', rent_amount: 3200, rent_due_date: 1 },
          { unit_name: '3D', rent_amount: 3100, rent_due_date: 1 },
          { unit_name: '4A', rent_amount: 3300, rent_due_date: 1 },
        ]
      },
      {
        name: 'Cedar Lane Studios',
        address: '654 Cedar Lane, San Francisco, CA 94106',
        rules: 'Utilities included. No pets. Quiet building.',
        units: [
          { unit_name: 'Studio 12', rent_amount: 2100, rent_due_date: 10 },
          { unit_name: 'Studio 15', rent_amount: 2050, rent_due_date: 10 },
        ]
      },
    ]

    // Check for existing properties to avoid duplicates
    let createdProperties: Array<{
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
          .select('id, unit_name, rent_amount, rent_due_date')
          .eq('property_id', property.id)

        createdProperties.push({
          ...property,
          units: existingUnits || []
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
          .select('id, unit_name, rent_amount, rent_due_date')

        if (unitError) throw unitError

        createdProperties.push({
          ...property,
          units: createdUnits || []
        })

        console.log(`✅ Created property "${property.name}" with ${createdUnits?.length || 0} units`)
      }
    }

    if (createdProperties.length === 0) {
      throw new Error('Failed to create or find properties')
    }

    const propertyIds = createdProperties.map(p => p.id)
    console.log(`✅ Working with ${propertyIds.length} properties\n`)

    // ========================================================================
    // Step 3: Create Demo Tenant via Invite Flow (NO shortcuts)
    // ========================================================================
    const demoTenantEmail = 'demo-tenant@uhome.internal'
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
    // Step 4: Create Additional Tenants (12-20 total, including demo tenant)
    // ========================================================================
    const additionalTenantsNeeded = 11 // 12 total - 1 demo = 11 more
    const tenantEmails: string[] = []

    // Generate tenant emails
    for (let i = 1; i <= additionalTenantsNeeded; i++) {
      tenantEmails.push(`demo-tenant${i}@uhome.internal`)
    }

    const tenantUserIds: string[] = [demoTenantUserId]
    const tenantLeases: Array<{ tenantId: string; leaseId: string; propertyId: string }> = []

    if (demoTenantId && demoLeaseId) {
      tenantLeases.push({
        tenantId: demoTenantId,
        leaseId: demoLeaseId,
        propertyId: demoPropertyId,
      })
    }

    console.log(`👥 Creating ${additionalTenantsNeeded} additional tenant users...`)

    const tenantCreationErrors: Array<{ email: string; error: string }> = []

    // Get all units from all properties
    const allUnits = createdProperties.flatMap(p => p.units)

    // Create roommates: some units will have multiple tenants
    const unitsForRoommates = allUnits.filter(unit => unit.unit_name.includes('A') || unit.unit_name.includes('Main'))

    for (let i = 0; i < tenantEmails.length; i++) {
      const email = tenantEmails[i]

      // For some tenants, create roommates in the same unit
      let selectedUnit
      if (i < 3 && unitsForRoommates.length > 0) {
        // First 3 tenants go to units that will have roommates
        selectedUnit = unitsForRoommates[i % unitsForRoommates.length]
      } else {
        // Others get their own units
        selectedUnit = allUnits[i % allUnits.length]
      }

      const property = createdProperties.find(p => p.units.some(u => u.id === selectedUnit.id))

      try {
        console.log(
          `   👤 Creating tenant ${i + 1}/${additionalTenantsNeeded}: ${email} for unit ${selectedUnit.unit_name} in ${property?.name}`
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
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            user_id: userId,
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
          const { data: lease, error: leaseError } = await supabase
            .from('leases')
            .insert({
              unit_id: selectedUnit.id,
              tenant_id: tenantId,
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
        await supabase
          .from('tenants')
          .update({ lease_id: leaseId })
          .eq('id', tenantId)

        console.log(`      ✅ Tenant created (ID: ${tenantId}, Lease ID: ${leaseId})`)

        tenantLeases.push({ tenantId, leaseId, propertyId: selectedUnit.property_id })

        if ((i + 1) % 3 === 0 || i === tenantEmails.length - 1) {
          console.log(
            `   ✅ Progress: ${i + 1}/${additionalTenantsNeeded} tenants created successfully`
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
    // Step 5: Create Rent Records (20+ records)
    // ========================================================================
    console.log('💰 Creating rent records...')
    const today = new Date()
    const rentRecords: Array<{
      property_id: string
      tenant_id: string
      lease_id: string
      amount: number
      due_date: string
      status: 'paid' | 'pending' | 'overdue'
      paid_date: string | null
      late_fee: number
    }> = []

    // Track if we've created an overdue record (guarantee at least one for tests)
    let hasOverdueRecord = false

    // Create rent records for each tenant-lease pair
    for (let tenantLeaseIdx = 0; tenantLeaseIdx < tenantLeases.length; tenantLeaseIdx++) {
      const { tenantId, leaseId, propertyId } = tenantLeases[tenantLeaseIdx]
      // Get property to get rent amount
      const property = createdProperties.find(p => p.id === propertyId)
      if (!property) continue

      const rentAmount = property.rent_amount
      const dueDate = property.rent_due_date || 1

      // Create records for last 8 months (distributed)
      for (let monthOffset = 7; monthOffset >= 0; monthOffset--) {
        const dueDateObj = new Date(today.getFullYear(), today.getMonth() - monthOffset, dueDate)
        const isPastMonth = monthOffset > 0
        const isCurrentMonth = monthOffset === 0

        let paidDate: string | null = null
        let status: 'paid' | 'pending' | 'overdue' = 'pending'
        let lateFee = 0

        // Guarantee at least one overdue record (use first tenant-lease, 2 months ago)
        if (!hasOverdueRecord && tenantLeaseIdx === 0 && monthOffset === 2) {
          status = 'overdue'
          lateFee = Math.floor(rentAmount * 0.1) // 10% late fee for overdue
          hasOverdueRecord = true
        } else if (isPastMonth) {
          // Past months: 70% paid on time, 20% paid late, 10% outstanding
          const rand = Math.random()
          if (rand < 0.7) {
            // Paid on time
            status = 'paid'
            paidDate = dueDateObj.toISOString().split('T')[0]
          } else if (rand < 0.9) {
            // Paid late
            status = 'paid'
            const daysLate = Math.floor(Math.random() * 5) + 1
            paidDate = new Date(dueDateObj.getTime() + daysLate * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
            lateFee = Math.floor(rentAmount * 0.05) // 5% late fee
          } else {
            // Outstanding
            status = 'overdue'
            lateFee = Math.floor(rentAmount * 0.1) // 10% late fee for overdue
          }
        } else if (isCurrentMonth) {
          // Current month: Ensure most are paid with paid_date in current month
          // This is critical for dashboard to show revenue > $0
          // 85% paid (higher than past months to ensure revenue shows), 15% pending
          if (Math.random() > 0.15) {
            status = 'paid'

            // Distribute paid_date throughout the month (days 1 to current day)
            const currentDayOfMonth = today.getDate()
            const randomDay = Math.floor(Math.random() * currentDayOfMonth) + 1
            paidDate = new Date(today.getFullYear(), today.getMonth(), randomDay)
              .toISOString()
              .split('T')[0]
          } else {
            status = 'pending'
          }
        }

        rentRecords.push({
          property_id: propertyId,
          tenant_id: tenantId,
          lease_id: leaseId,
          amount: rentAmount,
          due_date: dueDateObj.toISOString().split('T')[0],
          status,
          paid_date: paidDate,
          late_fee: lateFee,
        })
      }
    }

    console.log(`   Attempting to insert ${rentRecords.length} rent records...`)

    // Try inserting with minimal fields first to identify schema issues
    const { data: insertedRentRecords, error: rentError } = await supabase
      .from('rent_records')
      .insert(rentRecords)
      .select('id, status, paid_date')

    if (rentError) {
      console.warn(`   ⚠️  Rent records insertion failed: ${rentError.message}`)
      console.warn(`   Schema issue detected. Trying with minimal fields...`)

      // Fallback: try with only required fields
      const minimalRentRecords = rentRecords.map(r => ({
        property_id: r.property_id,
        tenant_id: r.tenant_id,
        lease_id: r.lease_id,
        amount: r.amount,
        due_date: r.due_date,
        status: r.status,
        paid_date: r.paid_date,
        late_fee: r.late_fee || 0,
      }))

      const { error: fallbackError } = await supabase
        .from('rent_records')
        .insert(minimalRentRecords)

      if (fallbackError) {
        console.error(`   ❌ Rent records creation completely failed: ${fallbackError.message}`)
      } else {
        console.log(`✅ Created ${minimalRentRecords.length} rent records (minimal fields)\n`)
      }
    } else {
      console.log(`✅ Created ${insertedRentRecords.length} rent records\n`)

      // Log how many paid records with paid_date we created
      const paidWithDateCount = insertedRentRecords.filter(
        (r: { status: string; paid_date?: string | null }) => r.status === 'paid' && r.paid_date
      ).length
      console.log(`   📊 Of which ${paidWithDateCount} are paid with paid_date set`)
    }

    // ========================================================================
    // Step 6: Create Expenses (30+ records)
    // ========================================================================
    console.log('💸 Creating expenses...')
    // Only use valid categories from schema: 'maintenance', 'utilities', 'repairs'
    const expenseCategories: Array<'maintenance' | 'utilities' | 'repairs'> = [
      'maintenance',
      'utilities',
      'repairs',
    ]
    const expenseNames: Record<string, string[]> = {
      maintenance: [
        'HVAC Maintenance',
        'Gutter Cleaning',
        'Lawn Mowing Service',
        'Window Cleaning',
        'Landscaping',
        'Snow Removal',
        'Pest Control',
      ],
      utilities: [
        'Water Bill',
        'Electricity Bill',
        'Gas Bill',
        'Trash Collection',
        'Internet Service',
      ],
      repairs: [
        'Plumbing Repair',
        'Electrical Repair',
        'Roof Repair',
        'Appliance Repair',
        'Drywall Repair',
        'Door Lock Replacement',
      ],
    }

    const expenses: Array<{
      property_id: string
      name: string
      category: 'maintenance' | 'utilities' | 'repairs' | null
      amount: number
      date: string
    }> = []

    // Distribute expenses across 8 months, ensuring current month has expenses for E2E tests
    for (let monthOffset = 7; monthOffset >= 0; monthOffset--) {
      // For current month (monthOffset === 0), ensure expenses are spread throughout the month
      // For past months, use random days
      const dayOfMonth =
        monthOffset === 0
          ? Math.floor(Math.random() * (today.getDate() + 1)) + 1 // Days 1 to current day (so they appear in current month)
          : Math.floor(Math.random() * 28) + 1
      const expenseDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, dayOfMonth)

      // Create 4-6 expenses per month
      const expensesThisMonth = Math.floor(Math.random() * 3) + 4

      for (let e = 0; e < expensesThisMonth; e++) {
        const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
        const names = expenseNames[category]
        const name = names[Math.floor(Math.random() * names.length)]

        // Realistic amounts based on category
        let amount: number
        if (category === 'repairs') {
          amount = Math.floor(Math.random() * 400) + 100 // $100-$500
        } else if (category === 'utilities') {
          amount = Math.floor(Math.random() * 200) + 50 // $50-$250
        } else {
          // maintenance
          amount = Math.floor(Math.random() * 300) + 50 // $50-$350
        }

        // Distribute across properties
        const propertyIndex = expenses.length % propertyIds.length
        const propertyId = propertyIds[propertyIndex]

        expenses.push({
          property_id: propertyId,
          name,
          category,
          amount,
          date: expenseDate.toISOString().split('T')[0],
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
    // Step 7: Create Work Orders (15+ records, bidirectional)
    // ========================================================================
    console.log('🔧 Creating work orders...')
    const workOrderCategories = ['Plumbing', 'HVAC', 'Electrical', 'Appliance', 'General']

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
    }> = []

    // Tenant-created work orders (8-10)
    const tenantCreatedCount = 9
    for (let i = 0; i < tenantCreatedCount && i < tenantLeases.length; i++) {
      const { tenantId, leaseId, propertyId } = tenantLeases[i]
      const tenantUserId = tenantUserIds[i + 1] || demoTenantUserId // +1 because first is demo

      const statusOptions: Array<'submitted' | 'seen' | 'scheduled' | 'in_progress' | 'resolved'> =
        ['submitted', 'seen', 'scheduled', 'in_progress', 'resolved']
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)]
      const category = workOrderCategories[Math.floor(Math.random() * workOrderCategories.length)]

      const descriptions: Record<string, string[]> = {
        Plumbing: [
          'Kitchen sink is leaking',
          'Toilet not flushing properly',
          'Shower head dripping',
        ],
        HVAC: ['AC not cooling', 'Heating not working', 'Strange noise from furnace'],
        Electrical: ['Outlet not working', 'Light switch broken', 'Circuit breaker keeps tripping'],
        Appliance: ['Dishwasher not draining', 'Refrigerator making noise', 'Oven not heating'],
        General: ['Door lock is stuck', "Window won't close", 'Carpet stain'],
      }

      const descList = descriptions[category] || ['Maintenance request']
      const description = descList[Math.floor(Math.random() * descList.length)]

      let scheduledDate: string | null = null
      let internalNotes: string | null = null

      if (status === 'scheduled' || status === 'in_progress') {
        const daysFromNow = Math.floor(Math.random() * 7) + 1
        scheduledDate = new Date(today.getTime() + daysFromNow * 24 * 60 * 60 * 1000).toISOString()
        internalNotes = 'Scheduled maintenance visit'
      }

      if (status === 'resolved') {
        internalNotes = 'Issue resolved'
      }

      workOrders.push({
        property_id: propertyId,
        tenant_id: tenantId,
        lease_id: leaseId,
        status,
        category,
        description,
        public_description: description,
        internal_notes: internalNotes,
        created_by: tenantUserId,
        created_by_role: 'tenant',
        scheduled_date: scheduledDate,
        visibility_to_tenants: true,
      })
    }

    // Landlord-created work orders (5-7)
    const landlordCreatedCount = 6
    let hasClosedWorkOrder = false
    for (let i = 0; i < landlordCreatedCount && i < tenantLeases.length; i++) {
      const { tenantId, leaseId, propertyId } = tenantLeases[i]

      const statusOptions: Array<'scheduled' | 'in_progress' | 'resolved' | 'closed'> = [
        'scheduled',
        'in_progress',
        'resolved',
        'closed',
      ]
      // Guarantee at least one closed work order for tests (first landlord-created work order)
      let status: 'scheduled' | 'in_progress' | 'resolved' | 'closed'
      if (!hasClosedWorkOrder && i === 0) {
        status = 'closed'
        hasClosedWorkOrder = true
      } else {
        status = statusOptions[Math.floor(Math.random() * statusOptions.length)]
      }
      const category = workOrderCategories[Math.floor(Math.random() * workOrderCategories.length)]

      const descriptions: Record<string, string[]> = {
        Plumbing: ['Routine pipe inspection', 'Annual plumbing maintenance'],
        HVAC: ['HVAC system maintenance', 'Filter replacement'],
        Electrical: ['Electrical safety inspection', 'Outlet upgrade'],
        Appliance: ['Appliance inspection', 'Maintenance check'],
        General: ['Property inspection', 'General maintenance'],
      }

      const descList = descriptions[category] || ['Maintenance task']
      const description = descList[Math.floor(Math.random() * descList.length)]

      let scheduledDate: string | null = null
      if (status === 'scheduled' || status === 'in_progress') {
        const daysFromNow = Math.floor(Math.random() * 10) + 1
        scheduledDate = new Date(today.getTime() + daysFromNow * 24 * 60 * 60 * 1000).toISOString()
      }

      workOrders.push({
        property_id: propertyId,
        tenant_id: tenantId,
        lease_id: leaseId,
        status,
        category,
        description,
        public_description: description,
        internal_notes: 'Landlord-initiated maintenance',
        created_by: demoLandlordId,
        created_by_role: 'landlord',
        scheduled_date: scheduledDate,
        visibility_to_tenants: true,
      })
    }

    const { error: workOrderError } = await supabase.from('maintenance_requests').insert(workOrders)
    if (workOrderError) {
      console.warn(`   ⚠️  Work orders error: ${workOrderError.message}`)
    } else {
      console.log(
        `✅ Created ${workOrders.length} work orders (${tenantCreatedCount} tenant-created, ${landlordCreatedCount} landlord-created)\n`
      )
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
      const leaseTenants = await supabase
        .from('tenants')
        .select('user_id')
        .eq('lease_id', leaseId)

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
    console.log(`   ✅ Messages: ${messages.length}\n`)

    // ========================================================================
    // Verification: Query actual counts from database
    // ========================================================================
    console.log('🔍 Verifying seeded data in database...\n')

    try {
      // Verify tenants (query via user_id since tenants table doesn't have email)
      // Get all demo tenant user IDs from auth
      const { data: allAuthUsers } = await supabase.auth.admin.listUsers()
      const demoTenantUserIds =
        allAuthUsers?.users
          ?.filter(u => u.email?.includes('demo-tenant') && u.email?.includes('@uhome.internal'))
          .map(u => u.id) || []

      let actualTenantCount = 0
      let tenantCountError = null

      if (demoTenantUserIds.length > 0) {
        const { count, error } = await supabase
          .from('tenants')
          .select('*', { count: 'exact', head: true })
          .in('user_id', demoTenantUserIds)

        actualTenantCount = count || 0
        tenantCountError = error
      }

      if (tenantCountError) {
        console.warn(`   ⚠️  Failed to query tenant count: ${tenantCountError.message}`)
      } else {
        console.log(`   📊 Tenants in DB: ${actualTenantCount} (expected: ${tenantLeases.length})`)
        if (actualTenantCount < tenantLeases.length) {
          console.warn(`   ⚠️  WARNING: Fewer tenants in DB than expected!`)
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

      if ((actualTenantCount || 0) < 8) {
        console.error(
          '❌ FAILED: Expected at least 8 tenants, but only found',
          actualTenantCount || 0
        )
        console.error('   This indicates tenant creation loop failed. Check error logs above.')
      }

      if ((currentMonthPaidCount || 0) === 0) {
        console.error('❌ FAILED: No paid rent in current month')
        console.error('   Dashboard will show $0 revenue. Check rent record creation logic.')
      }

      if ((actualTenantCount || 0) >= 8 && (currentMonthPaidCount || 0) > 0) {
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
