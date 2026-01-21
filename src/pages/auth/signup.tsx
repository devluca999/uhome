import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, User, Building } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { cn } from '@/lib/utils'
import {
  isDevModeAvailable,
  DEMO_TENANT_CREDENTIALS,
  DEMO_LANDLORD_CREDENTIALS,
} from '@/lib/tenant-dev-mode'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'landlord' | 'tenant'>('landlord')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)
  const { signUp, signIn, signInWithGoogle, signInWithMagicLink } = useAuth()
  const navigate = useNavigate()

  async function handleQuickLogin(loginRole: 'tenant' | 'landlord') {
    setError(null)
    setLoading(true)

    const credentials = loginRole === 'tenant' ? DEMO_TENANT_CREDENTIALS : DEMO_LANDLORD_CREDENTIALS

    // Auto-fill credentials
    setEmail(credentials.email)
    setRole(loginRole)

    // Add dev mode URL parameter
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('dev', loginRole)
    window.history.replaceState({}, '', currentUrl.toString())

    // Sign in (these are existing demo accounts, not new signups)
    const { error } = await signIn(credentials.email, credentials.password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Navigation handled by auth context, but ensure we go to correct dashboard with dev param
      const redirectPath =
        loginRole === 'tenant'
          ? `/tenant/dashboard?dev=${loginRole}`
          : `/landlord/dashboard?dev=${loginRole}`
      navigate(redirectPath, { replace: true })
    }
  }

  // Check if error indicates account already exists
  const isAccountExistsError = useMemo(() => {
    if (!error) return false
    const errorLower = error.toLowerCase()
    return (
      errorLower.includes('already registered') ||
      errorLower.includes('user already exists') ||
      errorLower.includes('email already') ||
      errorLower.includes('already exists')
    )
  }, [error])

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
      setError(error.message)
      setLoading(false)
    } else {
      setMagicLinkSent(true)
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { error } = await signUp(email, password, role)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Redirect to appropriate dashboard based on role
      const redirectPath = role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard'
      navigate(redirectPath)
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
          <p className="text-muted-foreground">Create your account</p>
        </div>
        <Card className="glass-card !max-h-none overflow-visible">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create an account to get started</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="space-y-3">
                  <div className="p-3 text-sm text-destructive bg-destructive/20 rounded-md border border-destructive/30">
                    {error}
                  </div>
                  <AnimatePresence>
                    {isAccountExistsError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Link to="/login">
                          <Button type="button" variant="default" className="w-full">
                            Sign In Instead
                          </Button>
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-8">
                  <label htmlFor="role" className="text-sm font-medium text-foreground">
                    I am a
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={role === 'landlord' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        role === 'landlord' && 'ring-2 ring-primary ring-offset-2'
                      )}
                      onClick={() => setRole('landlord')}
                      disabled={loading}
                    >
                      Landlord
                    </Button>
                    <Button
                      type="button"
                      variant={role === 'tenant' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        role === 'tenant' && 'ring-2 ring-primary ring-offset-2'
                      )}
                      onClick={() => setRole('tenant')}
                      disabled={loading}
                    >
                      Tenant
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
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
                  Sign up with Google
                </Button>
              </div>
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
                  required
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
                      minLength={6}
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
                  <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                </div>
              )}
              {magicLinkSent ? (
                <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                  Check your email! We've sent you a magic link to sign in.
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
                      {loading ? 'Creating account...' : 'Create Account'}
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
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  These buttons log in to existing demo accounts for testing
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
