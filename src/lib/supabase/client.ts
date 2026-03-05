import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Missing Supabase environment variables. Please check your .env.local file.'
  console.error('❌', errorMessage)
  console.error('   Required: VITE_SUPABASE_URL')
  console.error('   Required: VITE_SUPABASE_ANON_KEY')
  throw new Error(errorMessage)
}

// Validate connection in dev mode
if (import.meta.env.DEV) {
  console.debug('[Supabase Client] Initializing with URL:', supabaseUrl.substring(0, 30) + '...')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Test connection in dev mode
if (import.meta.env.DEV) {
  void Promise.resolve(supabase.from('users').select('id').limit(1))
    .then(({ error }) => {
      if (error) {
        console.warn('[Supabase Client] Connection test failed:', error.message)
        console.warn('   This may indicate an environment mismatch or RLS policy issue.')
      } else {
        console.debug('[Supabase Client] Connection test passed')
      }
    })
    .catch(err => {
      if (import.meta.env.DEV) {
        console.debug('[Supabase Client] Connection test error (optional):', err)
      }
    })
}
