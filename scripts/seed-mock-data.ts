// Mock Data Seeding Script for haume
// Run with: npm run seed:mock

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: VITE_SUPABASE_URL')
  console.error('Optional (recommended): SUPABASE_SERVICE_ROLE_KEY (for bypassing RLS)')
  console.error('\nUsing anon key (will need to be authenticated or may fail due to RLS)')
  process.exit(1)
}

// Use service role key if available, otherwise anon key
const isUsingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

if (!isUsingServiceRole) {
  console.warn('⚠️  Using anon key - some operations may fail due to RLS policies')
  console.warn('⚠️  Consider using SUPABASE_SERVICE_ROLE_KEY for full access\n')
}

async function seedMockData() {
  console.log('🌱 Starting mock data seeding...\n')

  try {
    let landlordId: string
    let landlordEmail = 'landlord@example.com'

    // Get or create landlord user
    if (isUsingServiceRole) {
      // Try to find existing landlord user
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id, email')
        .eq('role', 'landlord')
        .limit(1)

      if (existingUsers && existingUsers.length > 0) {
        landlordId = existingUsers[0].id
        landlordEmail = existingUsers[0].email || landlordEmail
        console.log(`✅ Using existing landlord: ${landlordEmail}`)
      } else {
        // Create new landlord user via auth admin
        const { data: authLandlord, error: authError } = await supabase.auth.admin.createUser({
          email: landlordEmail,
          password: 'password123',
          email_confirm: true,
        })

        if (authError || !authLandlord.user) {
          throw new Error(`Failed to create landlord user: ${authError?.message}`)
        }

        landlordId = authLandlord.user.id

        // Create landlord in public.users
        const { error: userError } = await supabase
          .from('users')
          .upsert({ id: landlordId, email: landlordEmail, role: 'landlord' })

        if (userError) throw userError
        console.log(`✅ Created landlord user: ${landlordEmail}`)
      }
    } else {
      // Using anon key - get current user or fail
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error(
          'Not authenticated. Please log in first, or use SUPABASE_SERVICE_ROLE_KEY to create users automatically.'
        )
      }

      landlordId = user.id

      // Ensure user is set as landlord
      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: landlordId, email: user.email, role: 'landlord' })

      if (userError) throw userError
      console.log(`✅ Using current authenticated user as landlord: ${user.email}`)
    }

    // Check for existing properties to avoid duplicates
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('id, name')
      .eq('owner_id', landlordId)
      .limit(10)

    if (existingProperties && existingProperties.length > 0) {
      console.log(`\n⚠️  Found ${existingProperties.length} existing properties`)
      console.log('   Skipping property creation to avoid duplicates')
      console.log('   Delete existing properties if you want fresh data\n')
    } else {
      // Create Properties
      const properties = [
        {
          owner_id: landlordId,
          name: '123 Oak Street',
          address: '123 Oak Street, San Francisco, CA 94102',
          rent_amount: 2800,
          rent_due_date: 1,
          rules: 'No smoking. Quiet hours after 10 PM. Pets allowed with deposit.',
        },
        {
          owner_id: landlordId,
          name: '456 Pine Avenue',
          address: '456 Pine Avenue, Apt 2B, San Francisco, CA 94103',
          rent_amount: 3200,
          rent_due_date: 5,
          rules: 'No pets. Street parking available. Building has laundry facilities.',
        },
        {
          owner_id: landlordId,
          name: '789 Elm Drive',
          address: '789 Elm Drive, Unit 5, San Francisco, CA 94104',
          rent_amount: 2400,
          rent_due_date: 15,
          rules: 'Garden access. Bicycle storage available. Tenant responsible for utilities.',
        },
      ]

      const { data: createdProperties, error: propError } = await supabase
        .from('properties')
        .insert(properties)
        .select()

      if (propError) throw propError
      console.log(`✅ Created ${createdProperties.length} properties`)

      // Create Tenant Users
      if (isUsingServiceRole) {
        const tenantEmails = ['tenant1@example.com', 'tenant2@example.com', 'tenant3@example.com']

        const tenantUsers = []
        for (const email of tenantEmails) {
          // Check if user already exists
          const { data: existingTenant } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single()

          if (existingTenant) {
            tenantUsers.push({ id: existingTenant.id, email: existingTenant.email || email })
            console.log(`   Using existing tenant: ${email}`)
          } else {
            const { data: authTenant, error: tenantAuthError } = await supabase.auth.admin.createUser({
              email,
              password: 'password123',
              email_confirm: true,
            })

            if (tenantAuthError || !authTenant.user) {
              console.warn(`   ⚠️  Failed to create tenant ${email}: ${tenantAuthError?.message}`)
              continue
            }

            await supabase
              .from('users')
              .upsert({ id: authTenant.user.id, email, role: 'tenant' })

            tenantUsers.push({ id: authTenant.user.id, email })
            console.log(`   Created tenant: ${email}`)
          }
        }

        console.log(`✅ Prepared ${tenantUsers.length} tenant users`)

        if (tenantUsers.length > 0) {
          // Assign Tenants to Properties
          const tenants = [
            {
              user_id: tenantUsers[0].id,
              property_id: createdProperties[0].id,
              move_in_date: '2024-01-15',
              lease_end_date: '2025-01-14',
            },
            ...(tenantUsers[1]
              ? [
                  {
                    user_id: tenantUsers[1].id,
                    property_id: createdProperties[1].id,
                    move_in_date: '2024-02-01',
                    lease_end_date: '2025-01-31',
                  },
                ]
              : []),
            ...(tenantUsers[2]
              ? [
                  {
                    user_id: tenantUsers[2].id,
                    property_id: createdProperties[2].id,
                    move_in_date: '2024-03-01',
                    lease_end_date: null,
                  },
                ]
              : []),
          ]

          const { data: createdTenants, error: tenantError } = await supabase
            .from('tenants')
            .insert(tenants)
            .select()

          if (tenantError) throw tenantError
          console.log(`✅ Created ${createdTenants.length} tenant assignments`)

          // Create Rent Records
          const today = new Date()
          const rentRecords = []

          for (let i = 0; i < createdTenants.length && i < createdProperties.length; i++) {
            const tenant = createdTenants[i]
            const property = createdProperties[i]
            const rentAmount = property.rent_amount
            const dueDate = property.rent_due_date || 1

            // Create records for last 3 months
            for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
              const dueDateObj = new Date(today.getFullYear(), today.getMonth() - monthOffset, dueDate)
              const isPastMonth = monthOffset > 0
              const isCurrentMonth = monthOffset === 0

              rentRecords.push({
                property_id: property.id,
                tenant_id: tenant.id,
                amount: rentAmount,
                due_date: dueDateObj.toISOString().split('T')[0],
                status: isPastMonth ? 'paid' : isCurrentMonth ? 'pending' : 'overdue',
                paid_date: isPastMonth
                  ? new Date(dueDateObj.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  : null,
              })
            }
          }

          const { error: rentError } = await supabase.from('rent_records').insert(rentRecords)

          if (rentError) {
            console.warn(`   ⚠️  Rent records error: ${rentError.message}`)
          } else {
            console.log(`✅ Created ${rentRecords.length} rent records`)
          }

          // Create Maintenance Requests
          const maintenanceRequests = [
            {
              property_id: createdProperties[0].id,
              tenant_id: createdTenants[0].id,
              status: 'pending',
              category: 'Plumbing',
              description: 'Kitchen sink is leaking slowly. Dripping every few seconds.',
            },
            {
              property_id: createdProperties[0].id,
              tenant_id: createdTenants[0].id,
              status: 'in_progress',
              category: 'HVAC',
              description: 'AC unit making loud noise in living room. Still works but very noisy.',
            },
            {
              property_id: createdProperties[0].id,
              tenant_id: createdTenants[0].id,
              status: 'completed',
              category: 'Electrical',
              description: 'Bedroom light switch not working properly. Fixed by electrician.',
            },
            ...(createdTenants[1] && createdProperties[1]
              ? [
                  {
                    property_id: createdProperties[1].id,
                    tenant_id: createdTenants[1].id,
                    status: 'pending',
                    category: 'General',
                    description: 'Front door lock is sticky, hard to turn key.',
                  },
                  {
                    property_id: createdProperties[1].id,
                    tenant_id: createdTenants[1].id,
                    status: 'completed',
                    category: 'Appliance',
                    description: 'Dishwasher not draining properly. Fixed by replacing drain hose.',
                  },
                ]
              : []),
          ]

          const { error: maintError } = await supabase.from('maintenance_requests').insert(maintenanceRequests)

          if (maintError) {
            console.warn(`   ⚠️  Maintenance requests error: ${maintError.message}`)
          } else {
            console.log(`✅ Created ${maintenanceRequests.length} maintenance requests`)
          }
        }

        // Create Documents (mock URLs - these won't actually work but show structure)
        const documents = [
          {
            property_id: createdProperties[0].id,
            uploaded_by: landlordId,
            file_url: 'https://via.placeholder.com/800x1000.pdf',
            file_name: 'Lease Agreement - 2024.pdf',
            file_type: 'application/pdf',
          },
          {
            property_id: createdProperties[0].id,
            uploaded_by: landlordId,
            file_url: 'https://via.placeholder.com/800x600.pdf',
            file_name: 'Keys and Access Instructions.pdf',
            file_type: 'application/pdf',
          },
          {
            property_id: createdProperties[1].id,
            uploaded_by: landlordId,
            file_url: 'https://via.placeholder.com/800x800.pdf',
            file_name: 'Maintenance Guidelines.pdf',
            file_type: 'application/pdf',
          },
        ]

        const { error: docError } = await supabase.from('documents').insert(documents)

        if (docError) {
          console.warn(`   ⚠️  Documents error: ${docError.message}`)
        } else {
          console.log(`✅ Created ${documents.length} documents`)
        }
      }
    }

    console.log('\n🎉 Mock data seeding complete!')
    if (isUsingServiceRole) {
      console.log('\n📋 Test Credentials:')
      console.log(`   Landlord: ${landlordEmail} / password123`)
      console.log('   Tenants:')
      console.log('     tenant1@example.com / password123')
      console.log('     tenant2@example.com / password123')
      console.log('     tenant3@example.com / password123')
      console.log('\n💡 You can now log in and see populated data in the app!')
    } else {
      console.log('\n💡 Log in as a landlord to see the seeded properties!')
    }
  } catch (error) {
    console.error('\n❌ Error seeding mock data:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

seedMockData()

