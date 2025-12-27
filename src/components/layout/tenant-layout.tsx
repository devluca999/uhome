import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function TenantLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'

  const navItems = [
    { path: '/tenant/dashboard', label: 'Dashboard' },
    { path: '/tenant/maintenance', label: 'Maintenance' },
    { path: '/tenant/documents', label: 'Documents' },
  ]

  async function handleSignOut() {
    // Clear dev bypass if active
    sessionStorage.removeItem('dev_bypass')
    sessionStorage.removeItem('dev_role')
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/tenant/dashboard" className="text-xl font-semibold text-stone-900">
                haume
              </Link>
              <div className="flex gap-1">
                {navItems.map(item => (
                  <Button
                    key={item.path}
                    variant={location.pathname === item.path ? 'default' : 'ghost'}
                    asChild
                  >
                    <Link to={item.path}>{item.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-600">{devBypass ? 'Dev Mode' : user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
