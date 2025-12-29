import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function HomePage() {
  const { user, role, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect authenticated users to their dashboard
    if (!loading && user && role) {
      const redirectPath = role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard'
      navigate(redirectPath, { replace: true })
    }
  }, [user, role, loading, navigate])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    )
  }

  // If user is authenticated, don't show this (will redirect)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-semibold text-stone-900 mb-2">haume</h1>
        <p className="text-stone-600 mb-8">
          Property management for independent landlords and tenants
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
