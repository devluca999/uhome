import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, User, Building } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import {
  isDevModeAvailable,
  DEMO_TENANT_CREDENTIALS,
  DEMO_LANDLORD_CREDENTIALS,
} from '@/lib/tenant-dev-mode'
import { logFailedLogin } from '@/lib/security/security-scanner'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)
  const {
    signIn,
    signOut,
    signInWithGoogle,
    signInWithMagicLink,
    user,
    role,
    loading: authLoading,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const locationState = location.state as { from?: { pathname?: string }; roleError?: boolean }
  const from = locationState?.from?.pathname || '/landlord/dashboard'
  const roleError = locationState?.roleError

  // Clear orphaned session when redirected due to roleError (e.g. after db reset)
  useEffect(() => {
    if (roleError && signOut) {
      signOut()
    }
  }, [roleError]) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === 'landlord') {
        navigate('/landlord/dashboard', { replace: true })
      } else if (role === 'tenant') {
        navigate('/tenant/dashboard', { replace: true })
      }
      // Don't redirect if role is null/undefined/unknown
    }
  }, [user, role, authLoading, navigate])

  // Check if error indicates no account found
  const isNoAccountError = useMemo(() => {
    if (!error) return false
    const errorLower = error.toLowerCase()
    return (
      errorLower.includes('invalid login credentials') ||
      errorLower.includes('invalid credentials') ||
      errorLower.includes('email not found') ||
      errorLower.includes('user not found')
    )
  }, [error])

  // Check if error is a network/connection failure (show helpful message)
  const isConnectionError = useMemo(() => {
    if (!error) return false
    const errorLower = error.toLowerCase()
    return (
      errorLower.includes('failed to fetch') ||
      errorLower.includes('authretryablefetcherror') ||
      errorLower.includes('network error') ||
      errorLower.includes('networkerror')
    )
  }, [error])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      // Log failed login attempt
      await logFailedLogin(email, error.message)
      setLoading(false)
    } else {
      // Navigation will happen automatically via auth state change
      navigate(from, { replace: true })
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setLoading(true)

    const { error } = await signInWithGoogle()

    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // OAuth redirect will handle navigation
  }

  async function handleMagicLink(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    setLoading(true)
    setMagicLinkSent(false)

    if (!email) {
      setError('Please enter your email address')
      setLoading(false)
      return
    }

    const { error } = await signInWithMagicLink(email)

    if (error) {
      // Handle rate limit errors specifically
      if (
        (error as { status?: number }).status === 429 ||
        error.message?.toLowerCase().includes('rate limit')
      ) {
        setError(
          'Too many requests. Please wait a few minutes before requesting another magic link, or use password authentication instead.'
        )
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      setMagicLinkSent(true)
      setLoading(false)
    }
  }

  async function handleQuickLogin(intendedRole: 'tenant' | 'landlord') {
    setError(null)
    setLoading(true)

    const credentials =
      intendedRole === 'tenant' ? DEMO_TENANT_CREDENTIALS : DEMO_LANDLORD_CREDENTIALS

    // Auto-fill credentials
    setEmail(credentials.email)

    // Add dev mode URL parameter
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('dev', intendedRole)
    window.history.replaceState({}, '', currentUrl.toString())

    try {
      // Sign in
      const { error } = await signIn(credentials.email, credentials.password)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Navigate immediately based on the intended role (from button click)
      // Don't wait for context role to be fetched - we know the intended role
      const redirectPath =
        intendedRole === 'tenant'
          ? `/tenant/dashboard?dev=${intendedRole}`
          : `/landlord/dashboard?dev=${intendedRole}`
      navigate(redirectPath, { replace: true })
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="uhome"
              className="h-12 w-12 object-contain flex-shrink-0"
              style={{ imageRendering: 'auto' }}
              onError={e => {
                console.error('Failed to load logo image from /logo.png')
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
          <h1 className="text-4xl font-semibold text-foreground mb-2">uhome</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>
        <Card className="glass-card !max-h-none overflow-visible">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your email and password to continue</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {roleError && (
                <div className="p-3 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                  Database was reset. Please sign in again with your demo credentials.
                </div>
              )}
              {error && (
                <div className="p-3 text-sm text-red-800 dark:text-red-500 bg-destructive/20 rounded-md border border-destructive/30">
                  {isConnectionError ? (
                    <>
                      <strong>Connection failed.</strong> Unable to reach the auth server.
                      {import.meta.env.DEV && (
                        <span className="block mt-2 text-muted-foreground">
                          Ensure Docker is running and Supabase is started:{' '}
                          <code className="text-xs">npx supabase start</code>. If using local
                          Supabase, check that <code className="text-xs">.env.local</code> has{' '}
                          <code className="text-xs">VITE_SUPABASE_URL=http://127.0.0.1:54321</code>.
                        </span>
                      )}
                    </>
                  ) : (
                    error
                  )}
                </div>
              )}
              <div className="space-y-4">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required={!useMagicLink}
                  disabled={loading}
                />
              </div>
              {!useMagicLink && (
                <div className="space-y-4">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none disabled:opacity-50 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-emerald-700" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {magicLinkSent ? (
                <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                  Check your email! We&apos;ve sent you a magic link to sign in.
                </div>
              ) : (
                <>
                  {useMagicLink ? (
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleMagicLink}
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Send Magic Link'}
                    </Button>
                  ) : (
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => {
                      setUseMagicLink(!useMagicLink)
                      setError(null)
                      setMagicLinkSent(false)
                    }}
                    disabled={loading}
                  >
                    {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
                  </Button>
                </>
              )}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or sign in with</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </Button>
            </form>
            {isDevModeAvailable() && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Quick Demo Access (Development Only)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickLogin('tenant')}
                    disabled={loading}
                    className="flex items-center justify-center"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Demo Tenant
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickLogin('landlord')}
                    disabled={loading}
                    className="flex items-center justify-center"
                  >
                    <Building className="w-4 h-4 mr-2" />
                    Demo Landlord
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            New to uhome?{' '}
            <Link to="/signup">
              <motion.span
                className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline transition-colors inline-block"
                animate={
                  isNoAccountError
                    ? {
                        textShadow: [
                          '0 0 0px rgba(59, 130, 246, 0)',
                          '0 0 10px rgba(59, 130, 246, 0.8), 0 0 20px rgba(59, 130, 246, 0.6)',
                          '0 0 0px rgba(59, 130, 246, 0)',
                        ],
                        boxShadow: [
                          '0 0 0px rgba(59, 130, 246, 0)',
                          '0 0 15px rgba(59, 130, 246, 0.5), 0 0 30px rgba(59, 130, 246, 0.3)',
                          '0 0 0px rgba(59, 130, 246, 0)',
                        ],
                      }
                    : {}
                }
                transition={{
                  duration: 2,
                  repeat: isNoAccountError ? Infinity : 0,
                  ease: 'easeInOut',
                }}
                style={
                  isNoAccountError
                    ? {
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'inline-block',
                      }
                    : {}
                }
              >
                Create account
              </motion.span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
