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

          // Create Rent Records - 15 months of historical data (power-user simulation)
          const today = new Date()
          const rentRecords = []
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
              const dueDateObj = new Date(today.getFullYear(), today.getMonth() - monthOffset, dueDate)
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
                paymentMethodLabel = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
                
                // Vary paid date: 70% on time or early, 30% late
                const paymentVariation = Math.random()
                if (paymentVariation < 0.3) {
                  // Late payment (1-5 days after due date)
                  const daysLate = Math.floor(Math.random() * 5) + 1
                  paidDate = new Date(dueDateObj.getTime() + daysLate * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  recordNotes = notes[Math.floor(Math.random() * notes.length)]
                } else if (paymentVariation < 0.7) {
                  // On time (due date)
                  paidDate = dueDateObj.toISOString().split('T')[0]
                } else {
                  // Early payment (1-2 days before)
                  const daysEarly = Math.floor(Math.random() * 2) + 1
                  paidDate = new Date(dueDateObj.getTime() - daysEarly * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                }
              } else if (isCurrentMonth) {
                // Current month: mix of paid and pending
                if (Math.random() > 0.3) {
                  // 70% chance it's paid
                  status = 'paid'
                  paymentMethodType = 'external'
                  paymentMethodLabel = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
                  const daysAgo = Math.floor(Math.random() * 5) // Paid 0-5 days ago
                  paidDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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

        // Create Expenses - 15-20 records across multiple months
        const expenseCategories = ['maintenance', 'utilities', 'repairs', 'insurance', 'taxes', 'landscaping', 'cleaning']
        const expenseDescriptions = {
          maintenance: ['Monthly HVAC service', 'Gutter cleaning', 'Lawn mowing service', 'Window cleaning'],
          utilities: ['Water bill', 'Electricity bill', 'Gas bill', 'Trash collection'],
          repairs: ['Plumbing repair - kitchen sink', 'Electrical repair - outlet replacement', 'Roof leak repair', 'Door lock replacement'],
          insurance: ['Property insurance premium', 'Liability insurance'],
          taxes: ['Property tax payment', 'Quarterly tax payment'],
          landscaping: ['Tree trimming', 'Garden maintenance', 'Sprinkler system repair'],
          cleaning: ['Deep cleaning service', 'Carpet cleaning', 'Window washing'],
        }

        const expenses = []
        const expenseMonths = 12 // Distribute expenses across 12 months

        for (let monthOffset = expenseMonths - 1; monthOffset >= 0; monthOffset--) {
          const expenseDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, Math.floor(Math.random() * 28) + 1)
          
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
            const propertyIndex = (expenses.length % createdProperties.length)
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
          .in('property_id', existingProperties.map(p => p.id))
          .limit(200)

        const { data: allExpenses } = await supabase
          .from('expenses')
          .select('id, description')
          .eq('user_id', landlordId)
          .limit(100)

        if (allRentRecords && allExpenses) {
          const notesToInsert = []

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
          const paidRecords = allRentRecords.filter(r => r.status === 'paid').slice(0, Math.floor(allRentRecords.filter(r => r.status === 'paid').length * 0.2))
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

seedMockData()

