// Mock Data Seeding Script for uhome
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
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

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

        const tenantUsers: Array<{ id: string; email: string }> = []
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
            const { data: authTenant, error: tenantAuthError } =
              await supabase.auth.admin.createUser({
                email,
                password: 'password123',
                email_confirm: true,
              })

            if (tenantAuthError || !authTenant.user) {
              console.warn(`   ⚠️  Failed to create tenant ${email}: ${tenantAuthError?.message}`)
              continue
            }

            await supabase.from('users').upsert({ id: authTenant.user.id, email, role: 'tenant' })

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

          // Create Rent Records - 15 months of historical data (power-user simulation)
          const today = new Date()
          const rentRecords: Array<{
            property_id: string
            tenant_id: string
            amount: number
            due_date: string
            status: 'paid' | 'pending' | 'overdue'
            paid_date: string | null
            payment_method_type: 'manual' | 'external' | null
            payment_method_label: string | null
            notes: string | null
          }> = []
          const paymentMethods = ['Zelle', 'Cash', 'Check', 'Venmo', 'Bank Transfer']
          const notes = [
            'Paid early via Zelle',
            'Tenant requested receipt',
            'Late payment - discussed with tenant',
            'Partial payment - balance due',
            'Automated payment processed',
            'Payment received on time',
            null,
            null,
            null,
          ]

          // Distribute rent records across all properties for power user demo
          // Ensure each property gets rent records even if tenant count varies
          for (let propIndex = 0; propIndex < createdProperties.length; propIndex++) {
            const property = createdProperties[propIndex]
            // Find tenant for this property, or cycle through tenants if none assigned
            const tenantIndex = propIndex % createdTenants.length
            const tenant = createdTenants[tenantIndex]
            if (!tenant) continue // Skip if no tenants exist
            const rentAmount = property.rent_amount
            const dueDate = property.rent_due_date || 1

            // Create records for last 15 months (enhanced for power-user simulation)
            for (let monthOffset = 14; monthOffset >= 0; monthOffset--) {
              const dueDateObj = new Date(
                today.getFullYear(),
                today.getMonth() - monthOffset,
                dueDate
              )
              const isPastMonth = monthOffset > 0
              const isCurrentMonth = monthOffset === 0
              const isFutureMonth = monthOffset < 0

              // Vary payment dates: some early (1-2 days before), some on time, some late (1-5 days after)
              let paidDate: string | null = null
              let status: 'paid' | 'pending' | 'overdue' = 'pending'
              let paymentMethodType: 'manual' | 'external' | null = null
              let paymentMethodLabel: string | null = null
              let recordNotes: string | null = null

              if (isPastMonth) {
                // Past months are paid
                status = 'paid'
                paymentMethodType = 'external'
                paymentMethodLabel =
                  paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

                // Vary paid date: 70% on time or early, 30% late
                const paymentVariation = Math.random()
                if (paymentVariation < 0.3) {
                  // Late payment (1-5 days after due date)
                  const daysLate = Math.floor(Math.random() * 5) + 1
                  paidDate = new Date(dueDateObj.getTime() + daysLate * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]
                  recordNotes = notes[Math.floor(Math.random() * notes.length)]
                } else if (paymentVariation < 0.7) {
                  // On time (due date)
                  paidDate = dueDateObj.toISOString().split('T')[0]
                } else {
                  // Early payment (1-2 days before)
                  const daysEarly = Math.floor(Math.random() * 2) + 1
                  paidDate = new Date(dueDateObj.getTime() - daysEarly * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]
                }
              } else if (isCurrentMonth) {
                // Current month: mix of paid and pending
                if (Math.random() > 0.3) {
                  // 70% chance it's paid
                  status = 'paid'
                  paymentMethodType = 'external'
                  paymentMethodLabel =
                    paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
                  const daysAgo = Math.floor(Math.random() * 5) // Paid 0-5 days ago
                  paidDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]
                } else {
                  // 30% chance it's still pending
                  status = 'pending'
                }
              } else {
                // Future months are pending
                status = 'pending'
              }

              rentRecords.push({
                property_id: property.id,
                tenant_id: tenant.id,
                amount: rentAmount,
                due_date: dueDateObj.toISOString().split('T')[0],
                status,
                paid_date: paidDate,
                payment_method_type: paymentMethodType,
                payment_method_label: paymentMethodLabel,
                notes: recordNotes,
              })
            }
          }

          const { error: rentError } = await supabase.from('rent_records').insert(rentRecords)

          if (rentError) {
            console.warn(`   ⚠️  Rent records error: ${rentError.message}`)
          } else {
            console.log(`✅ Created ${rentRecords.length} rent records (15 months per tenant)`)
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

          const { error: maintError } = await supabase
            .from('maintenance_requests')
            .insert(maintenanceRequests)

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

        // Create Expenses - 15-20 records across multiple months
        const today = new Date()
        const expenseCategories = [
          'maintenance',
          'utilities',
          'repairs',
          'insurance',
          'taxes',
          'landscaping',
          'cleaning',
        ]
        const expenseDescriptions = {
          maintenance: [
            'Monthly HVAC service',
            'Gutter cleaning',
            'Lawn mowing service',
            'Window cleaning',
          ],
          utilities: ['Water bill', 'Electricity bill', 'Gas bill', 'Trash collection'],
          repairs: [
            'Plumbing repair - kitchen sink',
            'Electrical repair - outlet replacement',
            'Roof leak repair',
            'Door lock replacement',
          ],
          insurance: ['Property insurance premium', 'Liability insurance'],
          taxes: ['Property tax payment', 'Quarterly tax payment'],
          landscaping: ['Tree trimming', 'Garden maintenance', 'Sprinkler system repair'],
          cleaning: ['Deep cleaning service', 'Carpet cleaning', 'Window washing'],
        }

        const expenses: Array<{
          property_id: string
          user_id: string
          category: string
          description: string
          amount: number
          date: string
          is_recurring: boolean
        }> = []
        const expenseMonths = 12 // Distribute expenses across 12 months

        for (let monthOffset = expenseMonths - 1; monthOffset >= 0; monthOffset--) {
          const expenseDate = new Date(
            today.getFullYear(),
            today.getMonth() - monthOffset,
            Math.floor(Math.random() * 28) + 1
          )

          // Create 1-2 expenses per month
          const expensesThisMonth = Math.random() > 0.5 ? 2 : 1

          for (let e = 0; e < expensesThisMonth; e++) {
            const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
            const descriptions = expenseDescriptions[category as keyof typeof expenseDescriptions]
            const description = descriptions[Math.floor(Math.random() * descriptions.length)]

            // Realistic amounts based on category
            let amount: number
            if (category === 'insurance' || category === 'taxes') {
              amount = Math.floor(Math.random() * 500) + 200 // $200-$700
            } else if (category === 'repairs') {
              amount = Math.floor(Math.random() * 400) + 100 // $100-$500
            } else if (category === 'utilities') {
              amount = Math.floor(Math.random() * 200) + 50 // $50-$250
            } else {
              amount = Math.floor(Math.random() * 300) + 50 // $50-$350
            }

            // Distribute across properties more evenly for power user demo
            // Cycle through properties to ensure all get expenses
            const propertyIndex = expenses.length % createdProperties.length
            const property = createdProperties[propertyIndex]

            expenses.push({
              property_id: property.id,
              user_id: landlordId,
              category,
              description,
              amount,
              date: expenseDate.toISOString().split('T')[0],
              is_recurring: category === 'utilities' && Math.random() > 0.5, // Some utilities are recurring
            })
          }
        }

        const { error: expenseError } = await supabase.from('expenses').insert(expenses)

        if (expenseError) {
          console.warn(`   ⚠️  Expenses error: ${expenseError.message}`)
        } else {
          console.log(`✅ Created ${expenses.length} expense records`)
        }
      }
    }

    // Insert notes after rent records and expenses are created
    // We need to fetch the created records to get their IDs
    if (isUsingServiceRole) {
      const { data: existingProperties } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId)
        .limit(10)

      if (existingProperties && existingProperties.length > 0) {
        const { data: allRentRecords } = await supabase
          .from('rent_records')
          .select('id, property_id, tenant_id, status, payment_method_label')
          .in(
            'property_id',
            existingProperties.map(p => p.id)
          )
          .limit(200)

        const { data: allExpenses } = await supabase
          .from('expenses')
          .select('id, description')
          .eq('user_id', landlordId)
          .limit(100)

        if (allRentRecords && allExpenses) {
          const notesToInsert: Array<{
            user_id: string
            entity_type: string
            entity_id: string
            content: string
          }> = []

          // Property notes - 2-3 per property
          for (const property of existingProperties) {
            notesToInsert.push(
              {
                user_id: landlordId,
                entity_type: 'property',
                entity_id: property.id,
                content: `**Property Notes**\n\nThis property has been well-maintained. Tenant is responsive to communication.`,
              },
              {
                user_id: landlordId,
                entity_type: 'property',
                entity_id: property.id,
                content: `**Maintenance Schedule**\n\n- HVAC service: Quarterly\n- Gutter cleaning: Bi-annually\n- Landscaping: Monthly`,
              }
            )
          }

          // Notes on some rent records (about 20% of paid records)
          const paidRecords = allRentRecords
            .filter(r => r.status === 'paid')
            .slice(0, Math.floor(allRentRecords.filter(r => r.status === 'paid').length * 0.2))
          for (const record of paidRecords) {
            notesToInsert.push({
              user_id: landlordId,
              entity_type: 'rent_record',
              entity_id: record.id,
              content: `**Payment Note**\n\nReceived payment via ${record.payment_method_label || 'manual entry'}. All good.`,
            })
          }

          // Notes on some expenses (about 30% of expenses)
          const selectedExpenses = allExpenses.slice(0, Math.floor(allExpenses.length * 0.3))
          for (const expense of selectedExpenses) {
            notesToInsert.push({
              user_id: landlordId,
              entity_type: 'expense',
              entity_id: expense.id,
              content: `**Expense Note**\n\n${expense.description} - Vendor invoice on file.`,
            })
          }

          if (notesToInsert.length > 0) {
            const { error: notesError } = await supabase.from('notes').insert(notesToInsert)

            if (notesError) {
              console.warn(`   ⚠️  Notes error: ${notesError.message}`)
            } else {
              console.log(`✅ Created ${notesToInsert.length} notes`)
            }
          }
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

// ============================================================================
// Tenant Dev Mode Seeding Function
// ============================================================================

async function seedTenantDevModeScenario() {
  console.log('🌱 Starting Tenant Dev Mode scenario seeding...\n')

  try {
    // Must use service role key for tenant dev mode seeding
    if (!isUsingServiceRole) {
      console.error('❌ Tenant Dev Mode seeding requires SUPABASE_SERVICE_ROLE_KEY')
      console.error('   This is needed to create demo accounts and bypass RLS')
      process.exit(1)
    }

    // ========================================================================
    // Step 1: Create Demo Landlord
    // ========================================================================
    const demoLandlordEmail = 'demo-landlord@uhome.internal'
    let demoLandlordId: string

    const { data: existingLandlord } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', demoLandlordEmail)
      .single()

    if (existingLandlord) {
      demoLandlordId = existingLandlord.id
      console.log(`✅ Using existing demo landlord: ${demoLandlordEmail}`)
    } else {
      const { data: authLandlord, error: authError } = await supabase.auth.admin.createUser({
        email: demoLandlordEmail,
        password: 'DemoLandlord2024!',
        email_confirm: true,
      })

      if (authError || !authLandlord.user) {
        throw new Error(`Failed to create demo landlord: ${authError?.message}`)
      }

      demoLandlordId = authLandlord.user.id

      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: demoLandlordId, email: demoLandlordEmail, role: 'landlord' })

      if (userError) throw userError
      console.log(`✅ Created demo landlord: ${demoLandlordEmail}`)
    }

    // ========================================================================
    // Step 2: Create Demo Property
    // ========================================================================
    const demoPropertyData = {
      owner_id: demoLandlordId,
      name: 'Sunrise Apartments - Unit 3B',
      address: '1234 Oak Street, Portland, OR 97201',
      rent_amount: 1450,
      rent_due_date: 1,
      rules: 'Water and trash included. Quiet hours 10 PM - 7 AM.',
    }

    const { data: existingProperty } = await supabase
      .from('properties')
      .select('id, name')
      .eq('owner_id', demoLandlordId)
      .eq('name', demoPropertyData.name)
      .single()

    let demoPropertyId: string

    if (existingProperty) {
      demoPropertyId = existingProperty.id
      console.log(`✅ Using existing demo property: ${demoPropertyData.name}`)
    } else {
      const { data: createdProperty, error: propError } = await supabase
        .from('properties')
        .insert(demoPropertyData)
        .select()
        .single()

      if (propError) throw propError
      demoPropertyId = createdProperty.id
      console.log(`✅ Created demo property: ${demoPropertyData.name}`)
    }

    // ========================================================================
    // Step 3: Create Demo Tenant Account
    // ========================================================================
    const demoTenantEmail = 'demo-tenant@uhome.internal'
    const demoTenantPassword = 'DemoTenant2024!'
    let demoTenantUserId: string

    const { data: existingTenantUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', demoTenantEmail)
      .single()

    if (existingTenantUser) {
      demoTenantUserId = existingTenantUser.id
      console.log(`✅ Using existing demo tenant user: ${demoTenantEmail}`)
    } else {
      const { data: authTenant, error: tenantAuthError } = await supabase.auth.admin.createUser({
        email: demoTenantEmail,
        password: demoTenantPassword,
        email_confirm: true,
      })

      if (tenantAuthError || !authTenant.user) {
        throw new Error(`Failed to create demo tenant: ${tenantAuthError?.message}`)
      }

      demoTenantUserId = authTenant.user.id

      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: demoTenantUserId, email: demoTenantEmail, role: 'tenant' })

      if (userError) throw userError
      console.log(`✅ Created demo tenant user: ${demoTenantEmail}`)
    }

    // ========================================================================
    // Step 4: Create Demo Tenant Assignment (deprecated schema)
    // ========================================================================
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', demoTenantUserId)
      .eq('property_id', demoPropertyId)
      .single()

    let demoTenantId: string

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

    if (existingTenant) {
      demoTenantId = existingTenant.id
      console.log(`✅ Using existing demo tenant assignment`)
    } else {
      const { data: createdTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          user_id: demoTenantUserId,
          property_id: demoPropertyId,
          move_in_date: sixMonthsAgo.toISOString().split('T')[0],
          lease_end_date: sixMonthsFromNow.toISOString().split('T')[0],
        })
        .select()
        .single()

      if (tenantError) throw tenantError
      demoTenantId = createdTenant.id
      console.log(`✅ Created demo tenant assignment`)
    }

    // ========================================================================
    // Step 5: Create Demo Lease (modern schema)
    // ========================================================================
    const { data: existingLease } = await supabase
      .from('leases')
      .select('id')
      .eq('tenant_id', demoTenantId)
      .eq('property_id', demoPropertyId)
      .single()

    let demoLeaseId: string

    if (existingLease) {
      demoLeaseId = existingLease.id
      console.log(`✅ Using existing demo lease`)
    } else {
      const { data: createdLease, error: leaseError } = await supabase
        .from('leases')
        .insert({
          property_id: demoPropertyId,
          tenant_id: demoTenantId,
          lease_start_date: sixMonthsAgo.toISOString().split('T')[0],
          lease_end_date: sixMonthsFromNow.toISOString().split('T')[0],
          lease_type: 'long-term',
          rent_amount: 1450,
          rent_frequency: 'monthly',
          security_deposit: 1450,
        })
        .select()
        .single()

      if (leaseError) throw leaseError
      demoLeaseId = createdLease.id
      console.log(`✅ Created demo lease`)
    }

    // ========================================================================
    // Step 6: Create Work Orders (3 different states)
    // ========================================================================
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Clear existing demo work orders to avoid duplicates
    await supabase
      .from('maintenance_requests')
      .delete()
      .eq('property_id', demoPropertyId)

    const workOrders = [
      // Work Order 1 - Submitted
      {
        property_id: demoPropertyId,
        tenant_id: demoTenantId,
        lease_id: demoLeaseId,
        status: 'submitted',
        category: 'Plumbing',
        description: 'Kitchen sink is leaking underneath. Water pooling in cabinet.',
        public_description: 'Kitchen sink is leaking underneath. Water pooling in cabinet.',
        created_by: demoTenantUserId,
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: twoDaysAgo.toISOString(),
        updated_at: twoDaysAgo.toISOString(),
      },
      // Work Order 2 - Scheduled
      {
        property_id: demoPropertyId,
        tenant_id: demoTenantId,
        lease_id: demoLeaseId,
        status: 'scheduled',
        category: 'HVAC',
        description: 'Heating not working properly. Temperature drops below 65°F at night.',
        public_description: 'Heating not working properly. Temperature drops below 65°F at night.',
        internal_notes: 'Scheduled HVAC technician visit',
        scheduled_date: threeDaysFromNow.toISOString(),
        created_by: demoTenantUserId,
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: oneWeekAgo.toISOString(),
        updated_at: oneWeekAgo.toISOString(),
      },
      // Work Order 3 - Resolved
      {
        property_id: demoPropertyId,
        tenant_id: demoTenantId,
        lease_id: demoLeaseId,
        status: 'resolved',
        category: 'Electrical',
        description: 'Living room outlet not working (left wall near window).',
        public_description: 'Living room outlet not working (left wall near window).',
        internal_notes: 'Replaced outlet, circuit breaker tripped',
        created_by: demoTenantUserId,
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: threeWeeksAgo.toISOString(),
        updated_at: twoDaysAgo.toISOString(),
      },
    ]

    const { data: createdWorkOrders, error: woError } = await supabase
      .from('maintenance_requests')
      .insert(workOrders)
      .select()

    if (woError) throw woError
    console.log(`✅ Created ${createdWorkOrders.length} demo work orders`)

    // ========================================================================
    // Step 7: Create Notifications
    // ========================================================================
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)

    // Clear existing demo notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', demoTenantUserId)

    const notifications = [
      // Notification 1 - Unread (work order 2 scheduled)
      {
        user_id: demoTenantUserId,
        type: 'work_order',
        body: 'Maintenance has been scheduled for: Heating not working properly. Temperature drops below 65°F at night.',
        property_id: demoPropertyId,
        work_order_id: createdWorkOrders[1].id,
        read: false,
        created_at: oneWeekAgo.toISOString(),
      },
      // Notification 2 - Read (work order 3 resolved)
      {
        user_id: demoTenantUserId,
        type: 'work_order',
        body: 'Work order has been resolved. Please confirm if the issue is fixed: Living room outlet not working (left wall near window).',
        property_id: demoPropertyId,
        work_order_id: createdWorkOrders[2].id,
        read: true,
        created_at: twoDaysAgo.toISOString(),
      },
      // Notification 3 - Unread (work order 1 seen)
      {
        user_id: demoTenantUserId,
        type: 'work_order',
        body: 'Your landlord has reviewed your work order: Kitchen sink is leaking underneath. Water pooling in cabinet.',
        property_id: demoPropertyId,
        work_order_id: createdWorkOrders[0].id,
        read: false,
        created_at: oneDayAgo.toISOString(),
      },
    ]

    const { data: createdNotifications, error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (notifError) throw notifError
    console.log(`✅ Created ${createdNotifications.length} demo notifications`)

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(80))
    console.log('🎉 Tenant Dev Mode Scenario Seeded Successfully!')
    console.log('='.repeat(80))
    console.log('\n📋 Demo Tenant Account:')
    console.log(`   Email: ${demoTenantEmail}`)
    console.log(`   Password: ${demoTenantPassword}`)
    console.log('\n🏠 Property: Sunrise Apartments - Unit 3B')
    console.log('\n🔧 Work Orders:')
    console.log('   1. Plumbing - Submitted (awaiting landlord review)')
    console.log('   2. HVAC - Scheduled (maintenance scheduled)')
    console.log('   3. Electrical - Resolved (awaiting tenant confirmation)')
    console.log('\n🔔 Notifications: 2 unread, 1 read')
    console.log('\n💡 To use Tenant Dev Mode:')
    console.log('   1. Set VITE_TENANT_DEV_MODE_ENABLED=true in .env.local')
    console.log('   2. Visit app with ?dev=tenant parameter')
    console.log('   3. Log in as demo tenant (or let mock data load)')
    console.log('\n📚 See docs/tenant-dev-mode.md for complete documentation\n')
  } catch (error) {
    console.error('\n❌ Error seeding Tenant Dev Mode scenario:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

// ============================================================================
// Main Execution
// ============================================================================

// ============================================================================
// Full Dev Mode Seeding Function (Landlord + Tenant)
// ============================================================================

async function seedFullDevModeScenario() {
  console.log('🌱 Starting Full Dev Mode scenario seeding (Landlord + Tenant)...\n')

  try {
    // Must use service role key
    if (!isUsingServiceRole) {
      console.error('❌ Full Dev Mode seeding requires SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }

    // ========================================================================
    // Step 1: Create Demo Landlord
    // ========================================================================
    const demoLandlordEmail = 'demo-landlord@uhome.internal'
    let demoLandlordId: string

    const { data: existingLandlord } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', demoLandlordEmail)
      .single()

    if (existingLandlord) {
      demoLandlordId = existingLandlord.id
      console.log(`✅ Using existing demo landlord: ${demoLandlordEmail}`)
    } else {
      const { data: authLandlord, error: authError } = await supabase.auth.admin.createUser({
        email: demoLandlordEmail,
        password: 'DemoLandlord2024!',
        email_confirm: true,
      })

      if (authError || !authLandlord.user) {
        throw new Error(`Failed to create demo landlord: ${authError?.message}`)
      }

      demoLandlordId = authLandlord.user.id

      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: demoLandlordId, email: demoLandlordEmail, role: 'landlord' })

      if (userError) throw userError
      console.log(`✅ Created demo landlord: ${demoLandlordEmail}`)
    }

    // ========================================================================
    // Step 2: Create Demo Tenant Account
    // ========================================================================
    const demoTenantEmail = 'demo-tenant@uhome.internal'
    const demoTenantPassword = 'DemoTenant2024!'
    let demoTenantUserId: string

    const { data: existingTenantUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', demoTenantEmail)
      .single()

    if (existingTenantUser) {
      demoTenantUserId = existingTenantUser.id
      console.log(`✅ Using existing demo tenant user: ${demoTenantEmail}`)
    } else {
      const { data: authTenant, error: tenantAuthError } = await supabase.auth.admin.createUser({
        email: demoTenantEmail,
        password: demoTenantPassword,
        email_confirm: true,
      })

      if (tenantAuthError || !authTenant.user) {
        throw new Error(`Failed to create demo tenant: ${tenantAuthError?.message}`)
      }

      demoTenantUserId = authTenant.user.id

      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: demoTenantUserId, email: demoTenantEmail, role: 'tenant' })

      if (userError) throw userError
      console.log(`✅ Created demo tenant user: ${demoTenantEmail}`)
    }

    // ========================================================================
    // Step 3: Create 2 Properties
    // ========================================================================
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

    const properties = [
      {
        owner_id: demoLandlordId,
        name: 'Sunrise Apartments - Unit 3B',
        address: '1234 Oak Street, Portland, OR 97201',
        rent_amount: 1450,
        rent_due_date: 1,
        rules: 'Water and trash included. Quiet hours 10 PM - 7 AM.',
      },
      {
        owner_id: demoLandlordId,
        name: 'Maple Apartments - Unit 2A',
        address: '5678 Maple Avenue, Portland, OR 97202',
        rent_amount: 1800,
        rent_due_date: 5,
        rules: 'Tenant responsible for utilities. Pet-friendly with deposit.',
      },
    ]

    // Clear existing demo properties
    await supabase
      .from('properties')
      .delete()
      .eq('owner_id', demoLandlordId)

    const { data: createdProperties, error: propError } = await supabase
      .from('properties')
      .insert(properties)
      .select()

    if (propError) throw propError
    console.log(`✅ Created ${createdProperties.length} demo properties`)

    const property1Id = createdProperties[0].id
    const property2Id = createdProperties[1].id

    // ========================================================================
    // Step 4: Create Households (if table exists)
    // ========================================================================
    let household1Id: string | null = null
    let household2Id: string | null = null

    try {
      // Check if households table exists by trying to query it
      const { data: existingHouseholds } = await supabase
        .from('households')
        .select('id')
        .eq('property_id', property1Id)
        .limit(1)

      // If query succeeds, create households
      const households = [
        { property_id: property1Id, name: 'Household 1' },
        { property_id: property2Id, name: 'Household 2' },
      ]

      const { data: createdHouseholds, error: householdError } = await supabase
        .from('households')
        .insert(households)
        .select()

      if (!householdError && createdHouseholds) {
        household1Id = createdHouseholds[0].id
        household2Id = createdHouseholds[1].id
        console.log(`✅ Created ${createdHouseholds.length} demo households`)
      }
    } catch (e) {
      // Households table may not exist, skip
      console.log('⚠️  Skipping households (table may not exist)')
    }

    // ========================================================================
    // Step 5: Create Tenant Assignments
    // ========================================================================
    // Clear existing demo tenants
    await supabase
      .from('tenants')
      .delete()
      .eq('user_id', demoTenantUserId)

    const { data: createdTenants, error: tenantError } = await supabase
      .from('tenants')
      .insert([
        {
          user_id: demoTenantUserId,
          property_id: property1Id,
          household_id: household1Id,
          move_in_date: sixMonthsAgo.toISOString().split('T')[0],
          lease_end_date: sixMonthsFromNow.toISOString().split('T')[0],
        },
      ])
      .select()

    if (tenantError) throw tenantError
    console.log(`✅ Created ${createdTenants.length} demo tenant assignment`)
    const demoTenantId = createdTenants[0].id

    // ========================================================================
    // Step 6: Create Leases
    // ========================================================================
    // Clear existing demo leases
    await supabase
      .from('leases')
      .delete()
      .eq('property_id', property1Id)

    const { data: createdLeases, error: leaseError } = await supabase
      .from('leases')
      .insert([
        {
          property_id: property1Id,
          tenant_id: demoTenantId,
          lease_start_date: sixMonthsAgo.toISOString().split('T')[0],
          lease_end_date: sixMonthsFromNow.toISOString().split('T')[0],
          lease_type: 'long-term',
          rent_amount: 1450,
          rent_frequency: 'monthly',
          security_deposit: 1450,
        },
      ])
      .select()

    if (leaseError) throw leaseError
    console.log(`✅ Created ${createdLeases.length} demo lease`)
    const demoLeaseId = createdLeases[0].id

    // ========================================================================
    // Step 7: Create Work Orders (Multiple states, both roles)
    // ========================================================================
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

    // Clear existing demo work orders
    await supabase
      .from('maintenance_requests')
      .delete()
      .in('property_id', [property1Id, property2Id])

    // Build work orders with conditional created_by (may not exist in all DBs)
    const workOrdersBase = [
      // Work Order 1 - Tenant-created, Submitted (Property 1)
      {
        property_id: property1Id,
        tenant_id: demoTenantId,
        lease_id: demoLeaseId,
        status: 'submitted',
        category: 'Plumbing',
        description: 'Kitchen sink is leaking underneath. Water pooling in cabinet.',
        public_description: 'Kitchen sink is leaking underneath. Water pooling in cabinet.',
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: twoDaysAgo.toISOString(),
        updated_at: twoDaysAgo.toISOString(),
      },
      // Work Order 2 - Tenant-created, Scheduled (Property 1)
      {
        property_id: property1Id,
        tenant_id: demoTenantId,
        lease_id: demoLeaseId,
        status: 'scheduled',
        category: 'HVAC',
        description: 'Heating not working properly. Temperature drops below 65°F at night.',
        public_description: 'Heating not working properly. Temperature drops below 65°F at night.',
        internal_notes: 'Scheduled HVAC technician visit',
        scheduled_date: threeDaysFromNow.toISOString(),
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: oneWeekAgo.toISOString(),
        updated_at: oneWeekAgo.toISOString(),
      },
      // Work Order 3 - Tenant-created, Resolved (Property 1)
      {
        property_id: property1Id,
        tenant_id: demoTenantId,
        lease_id: demoLeaseId,
        status: 'resolved',
        category: 'Electrical',
        description: 'Living room outlet not working (left wall near window).',
        public_description: 'Living room outlet not working (left wall near window).',
        internal_notes: 'Replaced outlet, circuit breaker tripped',
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: threeWeeksAgo.toISOString(),
        updated_at: twoDaysAgo.toISOString(),
      },
      // Work Order 4 - Landlord-created, Scheduled (Property 2)
      // Note: If schema requires tenant_id, we'll use demoTenantId
      {
        property_id: property2Id,
        tenant_id: demoTenantId, // Use existing tenant if schema requires it
        lease_id: null,
        status: 'scheduled',
        category: 'HVAC',
        description: 'Annual HVAC maintenance scheduled',
        public_description: 'Annual HVAC maintenance scheduled',
        internal_notes: 'Routine maintenance, tenant notified',
        scheduled_date: fiveDaysFromNow.toISOString(),
        created_by_role: 'landlord',
        visibility_to_tenants: true,
        created_at: oneWeekAgo.toISOString(),
        updated_at: oneWeekAgo.toISOString(),
      },
    ]
    
    // Add created_by if the column exists (try-catch will handle if it doesn't)
    const workOrders = workOrdersBase.map((wo, idx) => ({
      ...wo,
      created_by: idx < 3 ? demoTenantUserId : demoLandlordId,
    }))

    // Try inserting with all columns first, fall back to minimal schema if columns don't exist
    let createdWorkOrders: Array<{ id: string; [key: string]: unknown }>
    
    const { data: woWithAll, error: errorWithAll } = await supabase
      .from('maintenance_requests')
      .insert(workOrders)
      .select()
    
    if (errorWithAll) {
      // Try with minimal schema (only columns from original schema: property_id, tenant_id, status, category, description)
      console.log('⚠️  Advanced columns not found, using minimal schema (property_id, tenant_id, status, category, description)')
      const workOrdersMinimal = workOrdersBase.map((wo) => ({
        property_id: wo.property_id,
        tenant_id: wo.tenant_id || demoTenantId, // Ensure tenant_id is never null for minimal schema
        status: wo.status === 'submitted' ? 'pending' : wo.status === 'resolved' ? 'completed' : wo.status === 'in_progress' ? 'in_progress' : 'pending',
        category: wo.category,
        description: wo.description,
      }))
      const { data: woMinimal, error: errorMinimal } = await supabase
        .from('maintenance_requests')
        .insert(workOrdersMinimal)
        .select()
      
      if (errorMinimal) throw errorMinimal
      createdWorkOrders = woMinimal || []
    } else {
      createdWorkOrders = woWithAll || []
    }
    
    console.log(`✅ Created ${createdWorkOrders.length} demo work orders`)

    // ========================================================================
    // Step 8: Create Tasks/Checklists (if table exists)
    // ========================================================================
    try {
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('created_by', demoLandlordId)
        .limit(1)

      if (!existingTasks || existingTasks.length === 0) {
        const tasks = [
          {
            title: 'Move-in Checklist',
            assigned_to_type: 'tenant' as const,
            assigned_to_id: demoTenantId,
            status: 'pending' as const,
            deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            linked_context_type: 'property' as const,
            linked_context_id: property1Id,
            checklist_items: [
              { id: '1', text: 'Check all appliances', completed: false },
              { id: '2', text: 'Document any existing damage', completed: false },
              { id: '3', text: 'Test all light switches', completed: true },
            ],
            image_urls: [],
            created_by: demoLandlordId,
          },
        ]

        const { data: createdTasks, error: taskError } = await supabase
          .from('tasks')
          .insert(tasks)
          .select()

        if (!taskError && createdTasks) {
          console.log(`✅ Created ${createdTasks.length} demo tasks/checklists`)
        }
      } else {
        console.log(`✅ Using existing demo tasks`)
      }
    } catch (e) {
      console.log('⚠️  Skipping tasks (table may not exist)')
    }

    // ========================================================================
    // Step 9: Create Initial Messages (if table exists)
    // ========================================================================
    try {
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('lease_id', demoLeaseId)
        .limit(1)

      if (!existingMessages || existingMessages.length === 0) {
        const messages = [
          {
            lease_id: demoLeaseId,
            sender_id: demoLandlordId,
            sender_role: 'landlord' as const,
            body: 'Welcome to your new home! If you have any questions or need assistance, feel free to reach out.',
            intent: 'general' as const,
            status: null,
          },
          {
            lease_id: demoLeaseId,
            sender_id: demoTenantUserId,
            sender_role: 'tenant' as const,
            body: 'Thank you! Everything looks great so far.',
            intent: 'general' as const,
            status: null,
          },
        ]

        const { data: createdMessages, error: messageError } = await supabase
          .from('messages')
          .insert(messages)
          .select()

        if (!messageError && createdMessages) {
          console.log(`✅ Created ${createdMessages.length} demo messages`)
        }
      } else {
        console.log(`✅ Using existing demo messages`)
      }
    } catch (e) {
      console.log('⚠️  Skipping messages (table may not exist)')
    }

    // ========================================================================
    // Step 10: Create Notifications
    // ========================================================================
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)

    // Clear existing demo notifications
    await supabase
      .from('notifications')
      .delete()
      .in('user_id', [demoTenantUserId, demoLandlordId])

    const notifications = [
      // Tenant notifications
      {
        user_id: demoTenantUserId,
        type: 'work_order',
        body: 'Maintenance has been scheduled for: Heating not working properly. Temperature drops below 65°F at night.',
        property_id: property1Id,
        work_order_id: createdWorkOrders[1].id,
        read: false,
        created_at: oneWeekAgo.toISOString(),
      },
      {
        user_id: demoTenantUserId,
        type: 'work_order',
        body: 'Work order has been resolved. Please confirm if the issue is fixed: Living room outlet not working (left wall near window).',
        property_id: property1Id,
        work_order_id: createdWorkOrders[2].id,
        read: true,
        created_at: twoDaysAgo.toISOString(),
      },
      {
        user_id: demoTenantUserId,
        type: 'work_order',
        body: 'Your landlord has reviewed your work order: Kitchen sink is leaking underneath. Water pooling in cabinet.',
        property_id: property1Id,
        work_order_id: createdWorkOrders[0].id,
        read: false,
        created_at: oneDayAgo.toISOString(),
      },
      // Landlord notifications
      {
        user_id: demoLandlordId,
        type: 'work_order',
        body: 'New work order submitted for Sunrise Apartments - Unit 3B: Kitchen sink is leaking underneath. Water pooling in cabinet.',
        property_id: property1Id,
        work_order_id: createdWorkOrders[0].id,
        read: false,
        created_at: twoDaysAgo.toISOString(),
      },
      {
        user_id: demoLandlordId,
        type: 'work_order',
        body: 'Work order resolved: Living room outlet not working (left wall near window).',
        property_id: property1Id,
        work_order_id: createdWorkOrders[2].id,
        read: true,
        created_at: twoDaysAgo.toISOString(),
      },
    ]

    // Try inserting notifications, but skip if schema doesn't match
    try {
      const { data: createdNotifications, error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)
        .select()

      if (notifError && notifError.message?.includes('body')) {
        // Notifications table has different schema, skip for now
        console.log('⚠️  Notifications table schema mismatch, skipping notifications')
      } else if (notifError) {
        throw notifError
      } else {
        console.log(`✅ Created ${createdNotifications?.length || 0} demo notifications`)
      }
    } catch (e) {
      console.log('⚠️  Skipping notifications (schema may not match)')
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(80))
    console.log('🎉 Full Dev Mode Scenario Seeded Successfully!')
    console.log('='.repeat(80))
    console.log('\n📋 Demo Accounts:')
    console.log(`   Landlord: ${demoLandlordEmail} / DemoLandlord2024!`)
    console.log(`   Tenant: ${demoTenantEmail} / ${demoTenantPassword}`)
    console.log('\n🏠 Properties:')
    console.log('   1. Sunrise Apartments - Unit 3B ($1,450/month)')
    console.log('   2. Maple Apartments - Unit 2A ($1,800/month)')
    console.log('\n🔧 Work Orders:')
    console.log('   1. Plumbing - Submitted (tenant-created)')
    console.log('   2. HVAC - Scheduled (tenant-created)')
    console.log('   3. Electrical - Resolved (tenant-created)')
    console.log('   4. HVAC - Scheduled (landlord-created, Property 2)')
    console.log('\n📋 Tasks:')
    console.log('   1. Move-in Checklist (assigned to tenant)')
    console.log('\n💬 Messages:')
    console.log('   2 initial messages in lease thread')
    console.log('\n🔔 Notifications:')
    console.log('   Tenant: 2 unread, 1 read')
    console.log('   Landlord: 1 unread, 1 read')
    console.log('\n💡 To use Dev Mode:')
    console.log('   1. Set VITE_TENANT_DEV_MODE_ENABLED=true in .env.local')
    console.log('   2. Set VITE_LANDLORD_DEV_MODE_ENABLED=true in .env.local')
    console.log('   3. Use quick login buttons on /login page')
    console.log('   4. Or visit with ?dev=tenant or ?dev=landlord parameter')
    console.log('\n📚 See docs/tenant-dev-mode.md for complete documentation\n')
  } catch (error) {
    console.error('\n❌ Error seeding Full Dev Mode scenario:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

// ============================================================================
// Main Execution
// ============================================================================

// Check for seeding flags
const args = process.argv.slice(2)
if (args.includes('--full-dev-mode')) {
  seedFullDevModeScenario()
} else if (args.includes('--tenant-dev-mode')) {
  seedTenantDevModeScenario()
} else {
  seedMockData()
}
