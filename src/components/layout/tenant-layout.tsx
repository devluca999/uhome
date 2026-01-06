import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NotificationBadge } from '@/components/ui/notification-badge'
import { useAuth } from '@/contexts/auth-context'
import { useSettings } from '@/contexts/settings-context'
import { SidebarLayout } from './sidebar-layout'
import { useScrollReset } from '@/hooks/use-scroll-reset'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'

const ALL_NAV_ITEMS = [
  { path: '/tenant/dashboard', label: 'Dashboard', required: true },
  { path: '/tenant/maintenance', label: 'Maintenance', required: false },
  { path: '/tenant/documents', label: 'Documents', required: false },
  { path: '/tenant/messages', label: 'Messages', required: false },
  { path: '/tenant/settings', label: 'Settings', required: false },
]

export function TenantLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { settings } = useSettings()
  const [isMobile, setIsMobile] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'

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
    await signOut()
    navigate('/login')
  }

  // Render sidebar layout
  if (effectiveLayout === 'sidebar') {
    return <SidebarLayout navItems={visibleNavItems} basePath="/tenant" role="tenant" />
  }

  // Render header layout (default)
  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-nav sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/tenant/dashboard"
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
              <nav className="flex gap-1 ml-8" aria-label="Main navigation">
                {visibleNavItems.map(item => (
                  <Button
                    key={item.path}
                    variant={location.pathname === item.path ? 'default' : 'ghost'}
                    asChild
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                  >
                    <Link to={item.path}>{item.label}</Link>
                  </Button>
                ))}
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
        className="overscroll-contain"
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
  )
}
