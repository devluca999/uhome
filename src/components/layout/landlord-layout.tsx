import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AuthContext } from '@/contexts/auth-context'
import { useSettings } from '@/contexts/settings-context'
import { SidebarLayout } from './sidebar-layout'
import { AdminDemoToolbar } from '@/components/admin/admin-demo-toolbar'
import { useScrollReset } from '@/hooks/use-scroll-reset'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

const ALL_NAV_ITEMS = [
  { path: '/landlord/dashboard', label: 'Dashboard', required: true },
  { path: '/landlord/finances', label: 'Finances', required: false },
  { path: '/landlord/properties', label: 'Properties', required: false },
  { path: '/landlord/tenants', label: 'Tenants', required: false },
  { path: '/landlord/operations', label: 'Operations', required: false },
  { path: '/landlord/documents', label: 'Documents', required: false },
  { path: '/landlord/messages', label: 'Messages', required: false },
  { path: '/landlord/settings', label: 'Settings', required: false },
]

export function LandlordLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const { settings } = useSettings()
  const [isMobile, setIsMobile] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'
  const { user, signOut } = authContext || {}

  // Reset scroll on route changes
  useScrollReset()

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Determine layout: mobile defaults to sidebar, desktop defaults to header, user override persists
  const effectiveLayout = useMemo(() => {
    // If user has explicitly set a preference, use it
    if (settings.navLayout === 'sidebar' || settings.navLayout === 'header') {
      return settings.navLayout
    }
    // Otherwise, use defaults: mobile = sidebar, desktop = header
    return isMobile ? 'sidebar' : 'header'
  }, [settings.navLayout, isMobile])

  // Filter and order nav items based on settings
  const visibleNavItems = useMemo(() => {
    let items = ALL_NAV_ITEMS.filter(
      item => !settings.hiddenNavItems.includes(item.path) || item.required
    )

    // Apply custom order if available
    if (settings.navItemOrder.length > 0) {
      const ordered = settings.navItemOrder
        .map(path => items.find(item => item.path === path))
        .filter((item): item is (typeof ALL_NAV_ITEMS)[0] => item !== undefined)
      const unordered = items.filter(item => !settings.navItemOrder.includes(item.path))
      items = [...ordered, ...unordered]
    }

    return items
  }, [settings.hiddenNavItems, settings.navItemOrder])

  async function handleSignOut() {
    // Clear dev bypass if active
    sessionStorage.removeItem('dev_bypass')
    sessionStorage.removeItem('dev_role')
    if (signOut) await signOut()
    navigate('/login')
  }

  // Render sidebar layout
  if (effectiveLayout === 'sidebar') {
    return (
      <>
        <SidebarLayout navItems={visibleNavItems} basePath="/landlord" role="landlord" />
        <AdminDemoToolbar />
      </>
    )
  }

  // Render header layout (default)
  return (
    <>
      <AdminDemoToolbar />
      <div className="min-h-screen bg-background">
      <nav className="glass-nav sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/landlord/dashboard"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <img
                  src="/logo.png"
                  alt="uhome"
                  className="h-8 w-8 object-contain flex-shrink-0"
                  style={{ imageRendering: 'auto' }}
                  onError={e => {
                    console.error('Failed to load logo image from /logo.png')
                    // Hide image if it fails to load
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <span className="text-xl font-semibold text-foreground">uhome</span>
              </Link>
              <nav className="flex gap-1 ml-8 flex-shrink-0" aria-label="Main navigation">
                {visibleNavItems.map(item => {
                  const isActive = location.pathname === item.path
                  return (
                    <Button
                      key={item.path}
                      variant={isActive ? 'default' : 'ghost'}
                      asChild
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20 scale-[1.02] font-medium'
                          : 'bg-transparent hover:bg-muted',
                        'px-4 py-2 rounded-md transition-all duration-200 whitespace-nowrap'
                      )}
                    >
                      <Link to={item.path}>{item.label}</Link>
                    </Button>
                  )
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {devBypass ? 'Dev Mode' : user?.email}
              </span>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main
        className="overscroll-contain pt-16"
        style={{
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
            }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
    </>
  )
}
