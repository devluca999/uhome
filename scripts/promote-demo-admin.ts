/**
 * Promote demo-landlord to admin role for testing admin view modes.
 * Run: npx tsx scripts/promote-demo-admin.ts
 */
import './load-dotenv'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', 'demo-landlord@uhome.internal')
    .single()

  if (error || !users) {
    console.error('Demo landlord not found. Run npm run demo:reset first.')
    process.exit(1)
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', users.id)

  if (updateError) {
    console.error('Failed to promote:', updateError.message)
    process.exit(1)
  }

  console.log('✅ Promoted demo-landlord@uhome.internal to admin')
  console.log('   Log in with: demo-landlord@uhome.internal / DemoLandlord2024!')
}

main()
