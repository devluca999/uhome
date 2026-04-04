import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useContext, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, DollarSign, Grid3x3, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AuthContext } from '@/contexts/auth-context'
import { useSettings } from '@/contexts/settings-context'
import { SidebarLayout } from './sidebar-layout'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { AdminDemoToolbar } from '@/components/admin/admin-demo-toolbar'
import { MobileTopBar } from './mobile-top-bar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { useScrollReset } from '@/hooks/use-scroll-reset'
import { useSwipeToGoBack } from '@/hooks/use-swipe-to-go-back'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { mobilePageTitleForPath } from '@/lib/mobile-page-title'

const ALL_NAV_ITEMS = [
  { path: '/landlord/dashboard', label: 'Dashboard', required: true },
  { path: '/landlord/finances', label: 'Finances', required: false },
  { path: '/landlord/properties', label: 'Properties', required: false },
  { path: '/landlord/tenants', label: 'Tenants', required: false },
  { path: '/landlord/operations', label: 'Operations', required: false },
  { path: '/landlord/documents', label: 'Documents', required: false },
  { path: '/landlord/messages', label: 'Messages', required: false },
  { path: '/landlord/notifications', label: 'Notifications', required: false },
  { path: '/landlord/settings', label: 'Settings', required: false },
]

const MOBILE_PRIMARY_ITEMS = [
  { path: '/landlord/dashboard', label: 'Home', icon: Home },
  { path: '/landlord/finances', label: 'Finances', icon: DollarSign },
  { path: '/landlord/properties', label: 'Properties', icon: Grid3x3 },
  { path: '/landlord/operations', label: 'Operations', icon: Wrench },
] as const

const MOBILE_MORE_ITEMS = [
  { path: '/landlord/documents', label: 'Documents' },
  { path: '/landlord/messages', label: 'Messages' },
  { path: '/landlord/notifications', label: 'Notifications' },
  { path: '/landlord/settings', label: 'Settings' },
] as const

export function LandlordLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const { settings } = useSettings()
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()

  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'
  const { user, signOut, role, setViewMode } = authContext || {}

  useScrollReset()

  const mainRef = useRef<HTMLElement>(null)
  useSwipeToGoBack(mainRef)

  const effectiveLayout = useMemo(() => {
    if (settings.navLayout === 'sidebar' || settings.navLayout === 'header') {
      return settings.navLayout
    }
    return 'header'
  }, [settings.navLayout])

  const mobilePageTitle = useMemo(
    () => mobilePageTitleForPath(location.pathname, ALL_NAV_ITEMS),
    [location.pathname]
  )

  const visibleNavItems = useMemo(() => {
    let items = ALL_NAV_ITEMS.filter(
      item => !settings.hiddenNavItems.includes(item.path) || item.required
    )

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
    sessionStorage.removeItem('dev_bypass')
    sessionStorage.removeItem('dev_role')
    if (signOut) await signOut()
    navigate('/login')
  }

  if (isMobile) {
    return (
      <>
        <AdminDemoToolbar />
        <div className="min-h-screen bg-background overflow-x-hidden">
          <MobileTopBar homeTo="/landlord/dashboard" pageTitle={mobilePageTitle} />
          <main
            ref={mainRef}
            className="pb-20 overscroll-contain"
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
                  duration: prefersReducedMotion ? 0 : 0.15,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          <MobileBottomNav items={[...MOBILE_PRIMARY_ITEMS]} moreItems={[...MOBILE_MORE_ITEMS]} />
        </div>
      </>
    )
  }

  if (effectiveLayout === 'sidebar') {
    return (
      <>
        <SidebarLayout navItems={visibleNavItems} basePath="/landlord" role="landlord" />
        <AdminDemoToolbar />
      </>
    )
  }

  return (
    <>
      <AdminDemoToolbar />
      <div className="min-h-screen bg-background overflow-x-hidden">
        <nav className="glass-nav sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex h-16 min-w-0 items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
                <Link
                  to="/landlord/dashboard"
                  className="flex shrink-0 items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <img
                    src="/logo.png"
                    alt="uhome"
                    className="h-8 w-8 object-contain flex-shrink-0"
                    style={{ imageRendering: 'auto' }}
                    onError={e => {
                      console.error('Failed to load logo image from /logo.png')
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className="text-xl font-semibold text-foreground">uhome</span>
                </Link>
                <nav
                  className="ml-8 flex min-w-0 flex-1 gap-1 overflow-hidden"
                  aria-label="Main navigation"
                >
                  {visibleNavItems.map((item, index) => {
                    const isActive = location.pathname === item.path
                    const isLast = index === visibleNavItems.length - 1
                    return (
                      <div
                        key={item.path}
                        className={cn(
                          'overflow-hidden rounded-md [&>*]:overflow-hidden',
                          isLast && 'mr-2'
                        )}
                      >
                        <Button
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
                      </div>
                    )
                  })}
                </nav>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {devBypass ? 'Dev Mode' : user?.email}
                </span>
                {role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewMode?.('admin')
                      navigate('/admin/overview')
                    }}
                  >
                    Admin Panel
                  </Button>
                )}
                <NotificationDropdown />
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <main
          className="overscroll-contain pt-4"
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
