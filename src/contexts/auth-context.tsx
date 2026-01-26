import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { isDevModeAvailable, shouldActivateDevMode } from '@/lib/tenant-dev-mode'

type UserRole = 'landlord' | 'tenant' | 'admin' | null

interface AuthContextType {
  user: User | null
  session: Session | null
  role: UserRole
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    role: 'landlord' | 'tenant'
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthContext] Session fetch timeout - setting loading to false')
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return
      
      clearTimeout(timeoutId)
      
      if (error) {
        console.error('[AuthContext] Error getting session:', error)
        setLoading(false)
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      if (!mounted) return
      clearTimeout(timeoutId)
      console.error('[AuthContext] Exception getting session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only log auth state changes in verbose debug mode
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUTH === 'true') {
        console.debug(`[AuthContext] Auth state change: ${event}`, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
        })
      }

      // Detect immediate SIGNED_OUT after SIGNED_IN (indicates unwanted signOut)
      if (event === 'SIGNED_OUT' && session === null) {
        console.warn(`[AuthContext] ⚠️ SIGNED_OUT event detected - session cleared`)
      }

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchUserRole(userId: string) {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
      )
      
      const fetchPromise = supabase.from('users').select('role').eq('id', userId).single()
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (error) {
        console.error('[AuthContext] Error fetching user role:', error)
        setRole(null)
        setLoading(false)
      } else {
        setRole(data?.role as UserRole)
        setLoading(false)
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user role:', error)
      setRole(null)
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      // Log client configuration
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Only log in verbose debug mode
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUTH === 'true') {
        console.debug(`[AuthContext.signIn] Starting sign in`, {
          email,
          passwordLength: password.length,
          supabaseUrl: supabaseUrl || '[NOT SET]',
          anonKeyPrefix: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '[NOT SET]',
        })
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUTH === 'true') {
        console.debug(`[AuthContext.signIn] signInWithPassword result:`, {
          hasData: !!data,
          hasSession: !!data?.session,
          hasUser: !!data?.user,
          hasError: !!error,
          errorMessage: error?.message,
          errorStatus: error?.status,
          errorName: error?.name,
          rawError: error, // Raw error object
        })
      }

      if (error) {
        console.error(`[AuthContext.signIn] Sign in failed:`, error)
        return { error }
      }

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUTH === 'true') {
        console.debug(`[AuthContext.signIn] Sign in successful`, {
          userId: data?.user?.id,
          userEmail: data?.user?.email,
          sessionExpiresAt: data?.session?.expires_at
            ? new Date(data.session.expires_at * 1000).toISOString()
            : null,
        })
      }

      // Auto-activate dev mode if demo account
      if (isDevModeAvailable()) {
        const devModeRole = shouldActivateDevMode(email)
        if (devModeRole && typeof window !== 'undefined') {
          const currentUrl = new URL(window.location.href)
          if (!currentUrl.searchParams.has('dev')) {
            currentUrl.searchParams.set('dev', devModeRole)
            window.history.replaceState({}, '', currentUrl.toString())
          }
        }
      }

      return { error: null }
    } catch (error) {
      console.error(`[AuthContext.signIn] Exception during sign in:`, error)
      return { error: error as Error }
    }
  }

  async function signUp(email: string, password: string, role: 'landlord' | 'tenant') {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      // Set user role in users table
      // The trigger creates the user record, we just need to update the role
      if (data.user) {
        // Wait a moment for trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500))

        const { error: roleError } = await supabase
          .from('users')
          .update({ role, email: data.user.email })
          .eq('id', data.user.id)

        if (roleError) {
          console.error('Error setting user role:', roleError)
          return { error: roleError }
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async function signInWithMagicLink(email: string) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const value = {
    user,
    session,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithMagicLink,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
