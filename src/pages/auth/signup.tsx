import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, User, Building } from 'lucide-react'
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

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'landlord' | 'tenant'>('landlord')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signUp, signIn } = useAuth()
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
          <h1 className="text-4xl font-semibold text-foreground mb-2">uhome</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create an account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/20 rounded-md border border-destructive/30">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium text-foreground">
                  I am a
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={role === 'landlord' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setRole('landlord')}
                    disabled={loading}
                  >
                    Landlord
                  </Button>
                  <Button
                    type="button"
                    variant={role === 'tenant' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setRole('tenant')}
                    disabled={loading}
                  >
                    Tenant
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none disabled:opacity-50"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
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
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  These buttons log in to existing demo accounts for testing
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
