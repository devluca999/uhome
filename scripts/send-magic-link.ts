import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  console.error('\nMake sure your .env.local has the staging Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Email to send magic link to
const email = 'aldesigns197@gmail.com'

async function sendMagicLink() {
  console.log('📧 Sending magic link...\n')
  console.log(`   Email: ${email}`)
  console.log(`   Supabase URL: ${supabaseUrl}`)
  console.log(`   Callback URL: http://localhost:1000/auth/callback\n`)

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'http://localhost:1000/auth/callback',
      },
    })

    if (error) {
      console.error('❌ Error sending magic link:', error.message)
      console.error(`   Code: ${error.status || 'N/A'}`)
      process.exit(1)
    } else {
      console.log('✅ Magic link sent successfully!')
      console.log('\n📬 Check your email for the magic link')
      console.log('   The link will redirect to: http://localhost:1000/auth/callback')
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

sendMagicLink()
