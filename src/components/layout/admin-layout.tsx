import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useContext, useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AuthContext } from '@/contexts/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { cn } from '@/lib/utils'
import { DraggableDemoSelector } from '@/components/admin/draggable-demo-selector'

const ADMIN_NAV_ITEMS = [
  { path: '/admin/overview', label: 'Overview' },
  { path: '/admin/users', label: 'Users' },
  { path: '/admin/messages-support', label: 'Messages & Support' },
  { path: '/admin/payments', label: 'Payments' },
  { path: '/admin/waitlist', label: 'Waitlist', featureFlag: 'ENABLE_ADMIN_WAITLIST' },
  { path: '/admin/promotions', label: 'Promotions', featureFlag: 'ENABLE_ADMIN_PROMOTIONS' },
  { path: '/admin/newsletter', label: 'Newsletter', featureFlag: 'ENABLE_ADMIN_NEWSLETTER' },
  { path: '/admin/leads', label: 'Leads', featureFlag: 'ENABLE_ADMIN_LEADS' },
  { path: '/admin/performance', label: 'Performance' },
  { path: '/admin/audit-security', label: 'Audit & Security' },
  { path: '/admin/releases', label: 'Releases', featureFlag: 'ENABLE_RELEASE_TRACKING' },
  { path: '/admin/system', label: 'System' },
]

function adminNavItemIsActive(pathname: string, itemPath: string) {
  if (pathname === itemPath) return true
  if (
    itemPath === '/admin/messages-support' &&
    (pathname === '/admin/conversations' || pathname === '/admin/support')
  ) {
    return true
  }
  return false
}

type AdminNavEntry = (typeof ADMIN_NAV_ITEMS)[number]

function AdminNavList({
  items,
  pathname,
  onNavigate,
}: {
  items: AdminNavEntry[]
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
      {items.map((item, index) => {
        const isActive = adminNavItemIsActive(pathname, item.path)
        return (
          <motion.div
            key={item.path}
            initial={{ opacity: motionTokens.opacity.hidden, x: -8 }}
            animate={{ opacity: motionTokens.opacity.visible, x: 0 }}
            transition={{
              duration: motionTokens.duration.fast,
              delay: index * 0.03,
              ease: motionTokens.easing.standard,
            }}
          >
            <Button
              variant={isActive ? 'default' : 'ghost'}
              asChild
              className={cn(
                'w-full justify-start px-4 py-2 rounded-md transition-all duration-200 whitespace-nowrap',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20 scale-[1.02] font-medium'
                  : 'bg-transparent hover:bg-muted'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Link to={item.path} className="block truncate" onClick={() => onNavigate?.()}>
                {item.label}
              </Link>
            </Button>
          </motion.div>
        )
      })}
    </nav>
  )
}

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const prefersReducedMotion = useReducedMotion()
  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (!authContext) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Authentication error. Please refresh the page.</div>
      </div>
    )
  }

  const { signOut, user } = authContext

  async function handleSignOut() {
    sessionStorage.removeItem('dev_bypass')
    sessionStorage.removeItem('dev_role')
    await signOut()
    navigate('/login')
  }

  const visibleAdminNavItems = ADMIN_NAV_ITEMS.filter(item => {
    if (item.featureFlag) {
      return isFeatureEnabled(item.featureFlag)
    }
    return true
  })

  return (
    <div className="min-h-screen bg-background [isolation:isolate] flex flex-col md:flex-row">
      <DraggableDemoSelector />
      <aside className="hidden md:flex md:flex-col w-64 border-r border-border bg-card/50 sticky top-0 h-screen overflow-y-auto shrink-0">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <Link
              to="/admin/overview"
              className="flex items-center gap-3 text-xl font-semibold text-foreground hover:opacity-80 transition-opacity"
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
              <div className="flex items-center gap-2">
                <span>uhome</span>
                <Badge variant="secondary" rounded="full" className="lowercase text-xs">
                  admin
                </Badge>
              </div>
            </Link>
          </div>

          <AdminNavList items={visibleAdminNavItems} pathname={location.pathname} />

          <div className="p-4 border-t border-border space-y-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {devBypass ? 'Dev Mode' : user?.email || 'User'}
                </p>
                <Badge variant="secondary" rounded="full" className="text-xs lowercase mt-1">
                  admin
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex-1">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="md:hidden glass-nav sticky top-0 z-40 flex h-14 items-center justify-between px-4 gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            to="/admin/overview"
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          >
            <img
              src="/logo.png"
              alt=""
              className="h-7 w-7 object-contain shrink-0"
              style={{ imageRendering: 'auto' }}
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="font-semibold text-foreground truncate">uhome admin</span>
          </Link>
          <div className="w-10 shrink-0" aria-hidden />
        </header>

        <AnimatePresence>
          {mobileNavOpen && (
            <div key="admin-mobile-nav" className="fixed inset-0 z-50 md:hidden">
              <motion.div
                role="presentation"
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', damping: 28, stiffness: 320 }
                }
                className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col shadow-lg"
              >
                <div className="p-4 border-b border-border shrink-0">
                  <Link
                    to="/admin/overview"
                    className="flex items-center gap-3 text-lg font-semibold text-foreground hover:opacity-80 transition-opacity"
                    onClick={() => setMobileNavOpen(false)}
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
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">uhome</span>
                      <Badge variant="secondary" rounded="full" className="lowercase text-xs shrink-0">
                        admin
                      </Badge>
                    </div>
                  </Link>
                </div>
                <AdminNavList
                  items={visibleAdminNavItems}
                  pathname={location.pathname}
                  onNavigate={() => setMobileNavOpen(false)}
                />
                <div className="p-4 border-t border-border space-y-3 shrink-0 mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {devBypass ? 'Dev Mode' : user?.email || 'User'}
                      </p>
                      <Badge variant="secondary" rounded="full" className="text-xs lowercase mt-1">
                        admin
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMobileNavOpen(false)
                        void handleSignOut()
                      }}
                      className="flex-1"
                    >
                      Sign out
                    </Button>
                  </div>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <main
          className="flex-1 overscroll-contain min-h-0"
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
    </div>
  )
}
